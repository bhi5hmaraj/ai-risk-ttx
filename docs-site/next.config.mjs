import nextra from 'nextra'
import remarkMermaid from 'remark-mermaidjs'

// Wrap Next config with Nextra docs theme
const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  mdxOptions: {
    remarkPlugins: [remarkMermaid]
  }
})

export default withNextra({
  // If you want to host under /docs on the same domain, set DOCS_BASE_PATH=/docs
  ...(process.env.DOCS_BASE_PATH ? { basePath: process.env.DOCS_BASE_PATH } : {}),
  // Enable static export for easy hosting as a standalone site
  output: 'export'
})

