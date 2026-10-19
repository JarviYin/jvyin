// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site } from './src/site.config';

// https://astro.build/config
export default defineConfig({
  site: site.url,
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      // 功能性页面不进 sitemap
      filter: (page) =>
        !page.includes('/nl-issue/') &&
        !page.includes('/confirm/') &&
        !page.includes('/unsubscribe/') &&
        !page.includes('/blog/') &&
        !page.includes('/about/') &&
        !page.includes('/projects/'),
    }),
  ],
});
