"""Read-only local build checks; never calls subscription or production APIs."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import json
import struct

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
RECEIPT = ROOT / 'outputs/site-upgrade-20261018/static-qa.json'
ROUTES = ['/', '/products/', '/research/', '/newsletter/', '/agents/', '/onchain-finance/', '/research/hyperliquid-builders/']
ROUTES += [f'/newsletter/{i:03}/' for i in range(1, 10)]

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links, self.ids, self.meta, self.canonical = [], [], {}, ''
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in ('href', 'src'):
            if attrs.get(key):
                self.links.append(attrs[key])
        if tag == 'meta':
            self.meta[attrs.get('property') or attrs.get('name')] = attrs.get('content')
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href')

def file_for(path):
    file = DIST / unquote(path).lstrip('/')
    return file / 'index.html' if not file.suffix else file

errors, pages = [], []
for route in ROUTES:
    file = file_for(route)
    if not file.is_file():
        errors.append(f'Missing route: {route}')
        continue
    page = Page()
    text = file.read_text()
    page.feed(text)
    if len(page.ids) != len(set(page.ids)):
        errors.append(f'Duplicate HTML ids: {route}')
    expected = 'https://jvyin.com' + route
    if page.canonical != expected:
        errors.append(f'Canonical mismatch: {route} -> {page.canonical}')
    for key in ('og:title', 'og:description', 'og:image', 'twitter:card', 'twitter:image'):
        if not page.meta.get(key):
            errors.append(f'Missing {key}: {route}')
    for link in page.links + [page.meta.get('og:image', '')]:
        url = urlparse(link)
        if url.scheme and url.netloc != 'jvyin.com':
            continue
        if link.startswith('#') or not url.path:
            continue
        target = url.path if url.path.startswith('/') else str(Path(route) / url.path)
        if not file_for(target).is_file():
            errors.append(f'Broken internal asset/link: {route} -> {link}')
    if '\ufffd' in text:
        errors.append(f'Replacement character in {route}')
    pages.append({'route':route, 'canonical':page.canonical, 'ogImage':page.meta.get('og:image'), 'duplicateIds':len(page.ids)-len(set(page.ids))})

for name in ('site', 'agents', 'onchain-finance', 'hyperliquid-builders'):
    file = DIST / f'share/og/{name}.png'
    if file.is_file():
        raw = file.read_bytes()
        size = struct.unpack('>II', raw[16:24]) if raw.startswith(b'\x89PNG') else None
        if size != (1200, 630):
            errors.append(f'Invalid OG raster: {name}: {size}')
    else:
        errors.append(f'Missing OG image: {name}')

receipt = {'scope':'local static build only', 'routesChecked':len(pages), 'pages':pages, 'errors':sorted(set(errors))}
RECEIPT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'routesChecked':len(pages), 'errors':receipt['errors']}, ensure_ascii=False, indent=2))
raise SystemExit(1 if errors else 0)
