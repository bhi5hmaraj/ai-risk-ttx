# Getting Started

## Local development

- cd `docs-site/`
- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Static export: `npm run export` (outputs to `out/`)

## Hosting under /docs

If you want this site to be served at `/docs` on the same domain as the app, set:

```
DOCS_BASE_PATH=/docs
```

Then build/export and configure your host to mount the exported site at that path.

## Mermaid support

Mermaid diagrams in Markdown are enabled via `remark-mermaidjs` (see `next.config.mjs`).

