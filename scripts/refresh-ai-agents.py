"""Refresh public, first-party agent news and repository counters; never uses keys."""
import concurrent.futures
import datetime as dt
import email.utils
import json
import os
import re
from html.parser import HTMLParser
from pathlib import Path
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/data/ai-agents/current.json'
NOW = dt.datetime.now(dt.timezone.utc)
STAMP = NOW.isoformat().replace('+00:00', 'Z')
SOURCES = [
    ('openai-news', 'OpenAI News', 'https://openai.com/news/rss.xml', 'rss'),
    ('codex', 'Codex CLI', 'https://api.github.com/repos/openai/codex', 'repo'),
    ('claude-code', 'Claude Code', 'https://api.github.com/repos/anthropics/claude-code', 'repo'),
    ('codex-releases', 'Codex CLI', 'https://api.github.com/repos/openai/codex/releases/latest', 'release-latest'),
    ('claude-releases', 'Claude Code', 'https://api.github.com/repos/anthropics/claude-code/releases?per_page=8', 'releases'),
    ('deepseek-updates', 'DeepSeek', 'https://api-docs.deepseek.com/updates/', 'changelog'),
    ('grok-bot', 'Grok Bot', 'https://x.ai/changelog/bot/rss.xml', 'rss'),
]
ALLOWED = {'openai.com', 'www.openai.com', 'api.github.com', 'github.com', 'api-docs.deepseek.com', 'x.ai', 'www.x.ai'}


class Headings(HTMLParser):
    def __init__(self):
        super().__init__()
        self.entries, self.current = [], None

    def handle_starttag(self, tag, attrs):
        if tag in ('h2', 'h3'):
            self.current = [tag, dict(attrs).get('id'), '']

    def handle_data(self, text):
        if self.current is not None:
            self.current[2] += text

    def handle_endtag(self, tag):
        if self.current is not None and tag == self.current[0]:
            self.entries.append(self.current)
            self.current = None


def safe_url(url):
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname not in ALLOWED or parsed.username:
        raise ValueError('Source URL outside the public allowlist')
    return url


class PublicRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        safe_url(newurl)
        return super().redirect_request(request, fp, code, msg, headers, newurl)


def collect(source):
    key, name, url, kind = source
    request = urllib.request.Request(safe_url(url), headers={'User-Agent': 'jvyin-public-research/1.0', 'Accept': 'application/json, application/xml, text/xml'})
    opener = urllib.request.build_opener(PublicRedirects())
    with opener.open(request, timeout=20) as response:
        safe_url(response.url)
        raw = response.read(4_000_001)
    if len(raw) > 4_000_000:
        raise ValueError('Response exceeded 4 MB limit')
    data = {'id': key, 'name': name, 'url': url, 'kind': kind, 'observedAt': STAMP, 'status': 'ok', 'items': []}
    if kind == 'repo':
        obj = json.loads(raw)
        if not isinstance(obj.get('stargazers_count'), int) or obj['stargazers_count'] < 0:
            raise ValueError('Invalid repository count')
        data.update(stars=obj['stargazers_count'], forks=obj['forks_count'], repoUrl=safe_url(obj['html_url']))
    elif kind == 'changelog':
        headings = Headings()
        headings.feed(raw.decode('utf-8'))
        date = None
        for level, anchor, title in headings.entries:
            if level == 'h2':
                match = re.search(r'\d{4}-\d{2}-\d{2}', title)
                date = match.group(0) if match else None
            elif date and anchor and dt.date.fromisoformat(date) <= NOW.date():
                data['items'].append({'id': anchor, 'title': title.replace('\u200b', '').strip(), 'url': safe_url(url + '#' + anchor), 'publisher': name, 'publishedAt': date, 'kind': 'release', 'summary': '官方变更日志；模型、工具与价格调整以原始记录为准。', 'topic': 'ai', 'evidenceLevel': 'primary'})
            if len(data['items']) >= 6:
                break
    elif kind in ('releases', 'release-latest'):
        releases = json.loads(raw)
        for release in [releases] if kind == 'release-latest' else releases:
            if release.get('draft') or release.get('prerelease'):
                continue
            date = release['published_at']
            if dt.datetime.fromisoformat(date.replace('Z', '+00:00')) > NOW:
                continue
            data['items'].append({'id': str(release['id']), 'title': f"{name} · {release['tag_name']}", 'url': safe_url(release['html_url']), 'publisher': name, 'publishedAt': date, 'kind': 'release', 'summary': '官方仓库版本发布；查看原始变更记录。', 'topic': 'ai', 'evidenceLevel': 'primary'})
            if len(data['items']) >= 3:
                break
    else:
        for item in ET.fromstring(raw).findall('./channel/item'):
            title, link, date = (item.findtext(key, '').strip() for key in ('title', 'link', 'pubDate'))
            published = email.utils.parsedate_to_datetime(date)
            if published > NOW or not title:
                continue
            data['items'].append({'id': link, 'title': title, 'url': safe_url(link), 'publisher': name, 'publishedAt': published.isoformat(), 'kind': 'release' if key == 'grok-bot' else 'report', 'summary': '来自官方资讯源，点击阅读原文。', 'topic': 'ai', 'evidenceLevel': 'primary'})
            if len(data['items']) == 12:
                break
    if kind != 'repo' and not data['items']:
        raise ValueError('No valid dated entries in source')
    return data


def main():
    previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {'sources': []}
    by_id = {item['id']: item for item in previous['sources']}
    sources = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        pending = {pool.submit(collect, source): source for source in SOURCES}
        for future in concurrent.futures.as_completed(pending):
            source = pending[future]
            try:
                result = future.result()
            except Exception as error:
                # Preserve original observation time when retaining old data.
                result = dict(by_id.get(source[0], {'id': source[0], 'name': source[1], 'url': source[2], 'kind': source[3], 'items': [], 'observedAt': None}))
                result.update(status='stale' if result.get('observedAt') else 'unavailable', error=type(error).__name__, errorDetail=str(error)[:160], attemptedUrl=source[2])
                if not result.get('observedAt'):
                    result['url'] = source[2]
            result['attemptedAt'] = STAMP
            sources.append(result)
    sources.sort(key=lambda source: source['id'])
    payload = {'schemaVersion': 1, 'attemptedAt': STAMP, 'sources': sources, 'collector': 'scripts/refresh-ai-agents.py', 'scheduled': False}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix('.tmp')
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
    os.replace(temporary, OUTPUT)
    archive = OUTPUT.parent / 'snapshots' / f"{NOW.strftime('%Y%m%dT%H%M%SZ')}.json"
    archive.parent.mkdir(exist_ok=True)
    archive.write_text(OUTPUT.read_text())
    print(json.dumps({'sources': [{'name': s['name'], 'kind': s['kind'], 'status': s['status'], 'items': len(s['items'])} for s in sources]}, ensure_ascii=False))
    if not any(source['status'] == 'ok' for source in sources):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
