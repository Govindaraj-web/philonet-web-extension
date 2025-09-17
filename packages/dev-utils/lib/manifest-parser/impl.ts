import type { IManifestParser } from './types.js';
import type { ManifestType } from '@extension/shared';

const convertToFirefoxCompatibleManifest = (manifest: ManifestType) => {
  const manifestCopy = {
    ...manifest,
  } as { [key: string]: unknown };

  if (manifest.background?.service_worker) {
    manifestCopy.background = {
      scripts: [manifest.background.service_worker],
      type: 'module',
    };
  }
  if (manifest.options_page) {
    manifestCopy.options_ui = {
      page: manifest.options_page,
      browser_style: false,
    };
  }
  // Preserve the original CSP configuration for Firefox compatibility
  manifestCopy.content_security_policy = {
    extension_pages: "script-src 'self'; object-src 'self'; img-src 'self' data: https: http:; media-src 'self' data: blob:; connect-src 'self' https: http: ws: wss:;"
  };
  manifestCopy.permissions = (manifestCopy.permissions as string[]).filter(value => value !== 'sidePanel');

  delete manifestCopy.options_page;
  delete manifestCopy.side_panel;
  return manifestCopy as ManifestType;
};

export const ManifestParserImpl: IManifestParser = {
  convertManifestToString: (manifest, isFirefox) => {
    if (isFirefox) {
      manifest = convertToFirefoxCompatibleManifest(manifest);
    }

    return JSON.stringify(manifest, null, 2);
  },
};
