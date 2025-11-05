# Nextra Docs Site

This is a standalone Nextra (Next.js) site for documentation. It does not interfere with the main App Router app.

## Run locally

```
cd docs-site
npm install
npm run dev
```

## Build / Export

```
npm run build
npm run export   # outputs static site to out/
```

## Host under /docs

Set `DOCS_BASE_PATH=/docs` before build if the site will be served from `/docs` on your main domain.

## Content

- Pages live in `docs-site/pages/`.
- We will gradually port files from the repo’s `docs/` into this site. For now, both coexist.

