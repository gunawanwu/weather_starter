// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

export default defineConfig({
  integrations: [
    // Must come before starlight so ```mermaid blocks are transformed before Expressive Code sees them.
    mermaid({
      theme: 'default',
      autoTheme: true,
    }),
    starlight({
      title: 'Weather Starter',
      sidebar: [
        { label: 'Start here', items: ['getting-started'] },
        { label: 'Architecture', items: [{ autogenerate: { directory: 'architecture' } }] },
        { label: 'Backend', items: [{ autogenerate: { directory: 'backend' } }] },
        { label: 'Frontend', items: [{ autogenerate: { directory: 'frontend' } }] },
        { label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
      ],
    }),
  ],
});
