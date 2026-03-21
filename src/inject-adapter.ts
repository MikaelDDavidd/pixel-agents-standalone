/**
 * inject-adapter.ts
 *
 * Reads the built Pixel Agents webview (index.html + assets), injects the
 * ws-adapter.js script tag so the React app talks over WebSocket instead of
 * VS Code's postMessage, and writes everything into the standalone public/
 * directory.
 *
 * Usage:
 *   npx tsx src/inject-adapter.ts
 *   # or
 *   ts-node src/inject-adapter.ts
 */

import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const WEBVIEW_DIST = path.resolve('/tmp/pixel-agents/dist/webview');
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const SRC_INDEX = path.join(WEBVIEW_DIST, 'index.html');
const DEST_INDEX = path.join(PUBLIC_DIR, 'index.html');
const DEST_ASSETS = path.join(PUBLIC_DIR, 'assets');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively copy a directory. */
function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  // 1. Validate source exists
  if (!fs.existsSync(SRC_INDEX)) {
    console.error(
      `[inject-adapter] Source index.html not found at:\n  ${SRC_INDEX}\n` +
        `Make sure you have built the webview first (e.g. npm run build).`
    );
    process.exit(1);
  }

  // 2. Ensure output directories exist
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.mkdirSync(DEST_ASSETS, { recursive: true });

  // 3. Read the original index.html
  let html = fs.readFileSync(SRC_INDEX, 'utf-8');

  // 4. Inject the WebSocket adapter script BEFORE any existing <script> tags.
  //    This guarantees `acquireVsCodeApi` is available before the React bundle
  //    tries to call it.
  const adapterTag = '<script src="/ws-adapter.js"></script>';

  if (html.includes(adapterTag)) {
    console.log('[inject-adapter] Adapter script tag already present — skipping injection.');
  } else {
    // Strategy: insert before the first <script ...> in the document.
    const firstScriptIdx = html.search(/<script[\s>]/i);

    if (firstScriptIdx !== -1) {
      html =
        html.slice(0, firstScriptIdx) +
        adapterTag +
        '\n    ' +
        html.slice(firstScriptIdx);
    } else {
      // Fallback: insert right before </head>
      const headCloseIdx = html.indexOf('</head>');
      if (headCloseIdx !== -1) {
        html =
          html.slice(0, headCloseIdx) +
          '    ' +
          adapterTag +
          '\n  ' +
          html.slice(headCloseIdx);
      } else {
        // Last resort: prepend to the whole file
        html = adapterTag + '\n' + html;
      }
    }

    console.log('[inject-adapter] Injected ws-adapter.js script tag.');
  }

  // 5. Write modified index.html
  fs.writeFileSync(DEST_INDEX, html, 'utf-8');
  console.log(`[inject-adapter] Wrote ${DEST_INDEX}`);

  // 6. Copy webview assets (JS, CSS, images, etc.)
  const srcAssets = path.join(WEBVIEW_DIST, 'assets');

  if (fs.existsSync(srcAssets)) {
    copyDirSync(srcAssets, DEST_ASSETS);
    const count = fs.readdirSync(srcAssets, { recursive: true }).length;
    console.log(`[inject-adapter] Copied ${count} asset entries to ${DEST_ASSETS}`);
  } else {
    console.warn(
      `[inject-adapter] No assets/ directory found at ${srcAssets} — skipping asset copy.`
    );
  }

  console.log('[inject-adapter] Done.');
}

main();
