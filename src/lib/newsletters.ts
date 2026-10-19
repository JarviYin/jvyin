import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import matter from 'gray-matter';
import { marked, Renderer } from 'marked';

export interface Newsletter {
  id: string;
  title: string;
  subject?: string;
  pubDate: string;
  description: string;
  cover: string;
  body: string;
}

interface NewsletterFrontmatter {
  title?: unknown;
  subject?: unknown;
  pubDate?: unknown;
  description?: unknown;
}

// Astro bundles server modules into a temporary build directory, so import.meta.url
// cannot locate source content during getStaticPaths(). The project cwd is stable for
// Astro's build and dev commands.
const contentDirectory = resolve(process.cwd(), 'src/content/newsletters');
const publicImageOrigin = 'https://jvyin.com';

function stringValue(value: unknown, field: string, id: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Newsletter ${id} has no valid ${field}.`);
  }
  return value.trim();
}

function normalizeUrl(value: string, type: 'link' | 'image'): string | null {
  try {
    const url = new URL(value, publicImageOrigin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (type === 'image' && url.origin !== publicImageOrigin) return null;
    return url.origin === publicImageOrigin ? `${url.pathname}${url.search}${url.hash}` : url.href;
  } catch {
    return null;
  }
}

function renderNewsletter(markdown: string): string {
  const renderer = new Renderer();
  renderer.html = () => '';
  renderer.link = ({ href, title, tokens }) => {
    const safeUrl = href ? normalizeUrl(href, 'link') : null;
    if (!safeUrl) return marked.parser(tokens);
    const label = marked.parser(tokens);
    const titleAttribute = title ? ` title=${JSON.stringify(title)}` : '';
    const external = safeUrl.startsWith('http') && !safeUrl.startsWith(publicImageOrigin);
    const target = external ? ' target="_blank" rel="noreferrer"' : '';
    return `<a href=${JSON.stringify(safeUrl)}${titleAttribute}${target}>${label}</a>`;
  };
  renderer.image = ({ href, title, text }) => {
    const safeUrl = href ? normalizeUrl(href, 'image') : null;
    if (!safeUrl) return '';
    const titleAttribute = title ? ` title=${JSON.stringify(title)}` : '';
    return `<img src=${JSON.stringify(safeUrl)} alt=${JSON.stringify(text)} loading="lazy"${titleAttribute}>`;
  };

  return marked.parse(markdown, { renderer, async: false }) as string;
}

function readNewsletter(filename: string): Newsletter {
  const id = filename.replace(/\.md$/, '');
  if (!/^\d{3}$/.test(id)) throw new Error(`Unexpected newsletter filename: ${filename}`);

  const file = matter(readFileSync(resolve(contentDirectory, filename), 'utf8'));
  const data = file.data as NewsletterFrontmatter;
  const issue = Number(id);

  return {
    id,
    title: stringValue(data.title, 'title', id),
    subject: typeof data.subject === 'string' ? data.subject.trim() : undefined,
    pubDate: stringValue(data.pubDate, 'pubDate', id),
    description: stringValue(data.description, 'description', id),
    cover: `/newsletter/ep${String(issue).padStart(2, '0')}/cover.png`,
    body: renderNewsletter(file.content),
  };
}

let cachedNewsletters: Newsletter[] | undefined;

/** Local, build-time newsletter archive. It intentionally does not call the subscription API. */
export function getNewsletters(): Newsletter[] {
  if (!cachedNewsletters) {
    cachedNewsletters = readdirSync(contentDirectory)
      .filter((filename) => /^\d{3}\.md$/.test(filename))
      .map(readNewsletter)
      .sort((a, b) => b.pubDate.localeCompare(a.pubDate));
  }
  return cachedNewsletters;
}

export function getNewsletter(id: string): Newsletter | undefined {
  return getNewsletters().find((newsletter) => newsletter.id === id);
}
