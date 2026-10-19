"""Isolated collector tests: parsing, URL boundaries and failure retention. No network."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import sys
sys.dont_write_bytecode = True
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('collector', Path(__file__).with_name('refresh-ai-agents.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Response:
    url = 'https://openai.com/news/rss.xml'

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def read(self, size):
        return b'<rss><channel><item><title>Agent update</title><link>https://openai.com/index/agent-test</link><pubDate>Fri, 16 Oct 2026 00:00:00 GMT</pubDate></item><item><title>Future</title><link>https://openai.com/future</link><pubDate>Fri, 16 Oct 2099 00:00:00 GMT</pubDate></item></channel></rss>'


with patch.object(module.urllib.request.OpenerDirector, 'open', return_value=Response()):
    result = module.collect(module.SOURCES[0])
    assert len(result['items']) == 1
    assert result['items'][0]['title'] == 'Agent update'
    assert result['observedAt'] == module.STAMP

for url in ['http://openai.com/', 'https://openai.com.evil.example/', 'https://name:password@openai.com/']:
    try:
        module.safe_url(url)
    except ValueError:
        pass
    else:
        raise AssertionError('Unsafe source accepted')

try:
    module.PublicRedirects().redirect_request(None, None, 302, 'Found', {}, 'https://127.0.0.1/private')
except ValueError:
    pass
else:
    raise AssertionError('Redirect escaped source allowlist')

headings = module.Headings()
headings.feed('<h2 id="date-2026-10-17">Date: 2026-10-17</h2><h3 id="new-search">Search <em>API</em></h3>')
assert headings.entries == [['h2', 'date-2026-10-17', 'Date: 2026-10-17'], ['h3', 'new-search', 'Search API']]

with tempfile.TemporaryDirectory(prefix='jvyin-agent-qa-') as directory:
    target = Path(directory) / 'current.json'
    old_date = '2026-10-17T12:00:00Z'
    baseline = {'sources': [{'id': source[0], 'name': source[1], 'url': source[2], 'kind': source[3], 'observedAt': old_date, 'items': [], 'stars': 123} for source in module.SOURCES]}
    target.write_text(json.dumps(baseline))
    with patch.object(module, 'OUTPUT', target), patch.object(module, 'collect', side_effect=OSError('Simulated offline source')), contextlib.redirect_stdout(io.StringIO()):
        try:
            module.main()
        except SystemExit as error:
            assert error.code == 1
        else:
            raise AssertionError('All-source failure must not exit successfully')
    retained = json.loads(target.read_text())
    assert all(source['status'] == 'stale' for source in retained['sources'])
    assert all(source['observedAt'] == old_date and source['stars'] == 123 for source in retained['sources'])
    assert len(list((Path(directory) / 'snapshots').glob('*.json'))) == 1

print('PASS: dated RSS parsing, future rejection, source allowlist, nested headings, failure retention and nonzero offline status. No external requests.')
