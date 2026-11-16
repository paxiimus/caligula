const expo = require('eslint-config-expo/flat');

const noNet = 'Caligula makes no network requests.';

module.exports = [
  ...expo,
  { ignores: ['dist/*', 'scripts/*', 'docs/*'] },
  {
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: noNet },
        { name: 'XMLHttpRequest', message: noNet },
        { name: 'WebSocket', message: noNet },
      ],
    },
  },
];
