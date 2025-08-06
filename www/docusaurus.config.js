// @ts-check
const path = require('path');

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: 'React Widgets',
  tagline: 'Build Beautiful Forms',
  url: 'https://your-docusaurus-test-site.com',
  baseUrl: process.env.BASE_URL ?? '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  organizationName: 'jquense',
  projectName: 'react-widgets',

  stylesheets: [
    {
      href: 'https://use.fontawesome.com/releases/v5.1.0/css/solid.css',
      type: 'text/css',
      integrity:
        'sha384-TbilV5Lbhlwdyc4RuIV/JhD8NR+BfMrvz4BL5QFa2we1hQu6wvREr3v6XSRfCTRp',
      crossOrigin: 'anonymous',
    },
    {
      href: 'https://use.fontawesome.com/releases/v5.1.0/css/brands.css',
      type: 'text/css',
      integrity:
        'sha384-7xAnn7Zm3QC1jFjVc1A6v/toepoG3JXboQYzbM0jrPzou9OFXm/fY6Z/XiIebl/k',
      crossOrigin: 'anonymous',
    },
    {
      href: 'https://use.fontawesome.com/releases/v5.1.0/css/fontawesome.css',
      type: 'text/css',
      integrity:
        'sha384-ozJwkrqb90Oa3ZNb+yKFW2lToAWYdTiF1vt8JiH5ptTGHTGcN7qdoR1F95e0kYyG',
      crossOrigin: 'anonymous',
    },
  ],

  themeConfig: {
    colorMode: {
      disableSwitch: true,
    },
    navbar: {
      title: 'React Widgets',
      logo: {
        alt: 'React Widgets Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: 'docs/',
          label: 'Docs',
          position: 'left',
        },
        {
          href: 'https://github.com/jquense/react-widgets',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [],
      copyright: `Copyright © ${new Date().getFullYear()} Jason Quense. Built with Docusaurus.`,
    },
    // If you're still using custom prism themes
    // prism: {
    //   theme: require('./src/syntax-theme'),
    // },
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
        },
        theme: {
          customCss: [
            require.resolve('./src/css/custom.scss'),
            require.resolve('./src/css/tailwind.css'),
          ],
        },
      },
    ],
  ],

  plugins: [
    path.resolve(__dirname, './plugins/webpack'),
    'docusaurus-plugin-astroturf',
    // You can reintroduce the docgen/reactMetadata logic below if needed
    [
      path.resolve(__dirname, './plugins/react-metadata'),
      {
        src: '../packages/react-widgets/src/**/*.{js,tsx,ts}',
        watchPaths: ['./plugins/examples/*'],
        docgen: {
          handlers: [require('./plugins/doc-handler')],
        },
      },
    ],
  ],
};
