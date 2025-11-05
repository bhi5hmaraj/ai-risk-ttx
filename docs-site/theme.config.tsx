import React from 'react'

export default {
  logo: <span>Simulacra Docs</span>,
  project: {
    link: 'https://github.com/'
  },
  docsRepositoryBase: '',
  useNextSeoProps() {
    return { titleTemplate: '%s – Simulacra Docs' }
  },
  footer: {
    text: 'Simulacra Documentation'
  },
  sidebar: {
    defaultMenuCollapseLevel: 1
  }
}

