import { readFileSync } from 'node:fs';
import type { ManifestType } from '@extension/shared';
import env from '@extension/env';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * @prop default_locale
 * if you want to support multiple languages, you can use the following reference
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
 *
 * @prop browser_specific_settings
 * Must be unique to your extension to upload to addons.mozilla.org
 * (you can delete if you only want a chrome extension)
 *
 * @prop permissions
 * Firefox doesn't support sidePanel (It will be deleted in manifest parser)
 *
 * @prop content_scripts
 * css: ['content.css'], // public folder
 */
const manifest = {
  manifest_version: 3,
  default_locale: 'en',
  name: '__MSG_extensionName__',
  key: readFileSync('./key.pem', 'utf8'),
  browser_specific_settings: {
    gecko: {
      id: 'example@example.com',
      strict_min_version: '109.0',
    },
  },
  version: packageJson.version,
  description: '__MSG_extensionDescription__',
  host_permissions: ['<all_urls>', 'file:///*/*'],
  permissions: ['storage', 'scripting', 'tabs', 'notifications', 'sidePanel', 'activeTab', 'identity'],
  options_page: 'options/index.html',
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_popup: 'popup/index.html',
    default_icon: 'icon-34.png',
  },
  icons: {
    '128': 'icon-128.png',
  },
  commands: {
    'toggle-side-panel': {
      suggested_key: {
        default: 'Ctrl+Shift+P',
        mac: 'Command+Shift+P'
      },
      description: 'Toggle Philonet Side Panel'
    }
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      js: ['content/all.iife.js'],
    },
    {
      matches: ['https://example.com/*'],
      js: ['content/example.iife.js'],
    },
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      js: ['content-ui/all.iife.js'],
    },
    {
      matches: ['https://example.com/*'],
      js: ['content-ui/example.iife.js'],
    },
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      css: ['content.css'],
    },
  ],
  devtools_page: 'devtools/index.html',
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png', 'philonet.png'],
      matches: ['*://*/*'],
    },
  ],
  side_panel: {
    default_path: 'side-panel/index.html',
  },
  oauth2: {
    client_id: env.CEB_GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com',
    scopes: ['openid', 'email', 'profile']
  },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'; img-src 'self' data: https: http:; media-src 'self' data: blob:; connect-src 'self' https: http: ws: wss:;"
  },
} satisfies ManifestType;

export default manifest;
