const path = require('path');

module.exports = {
  content: [
    './docs/**/*.{js,ts,tsx,mdx}',
    './src/**/*.{js,ts,tsx}',
    '../react-widgets/src/**/*.{js,ts,tsx}',
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      flexGrow: {
        2: '2',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
    container: false,
    backgroundColor: false,
    borderColor: false,
    divideColor: false,
    gradientColorStops: false,
    placeholderColor: false,
    ringColor: false,
    ringOffsetColor: false,
    textColor: false,
  },
};
