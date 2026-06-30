import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The production bundle loads only its own hashed module script (no inline
// handlers/scripts), so the baseline meta CSP can lock script-src to 'self'.
// style-src keeps 'unsafe-inline' for the inline style attributes the JSX emits.
// Injected at build only — a strict meta CSP would break Vite's dev HMR (eval).
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";

function injectCsp(): Plugin {
  return {
    name: 'inject-baseline-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('</title>', `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
}

export default defineConfig({
  // GitHub Pages serves this project repo under /powerlifting/, so assets must
  // resolve there, not at the domain root. Switch to '/' for a root/custom domain.
  base: '/powerlifting/',
  plugins: [
    injectCsp(),
    react(),
    VitePWA({
      registerType: 'prompt',
      // We register manually in UpdateBanner via virtual:pwa-register, so the
      // plugin must not also inject a registration script.
      injectRegister: false,
      // Vite emits content-hashed filenames, so the build output is precached
      // (and revision-tracked) by Workbox — the modern equivalent of the old
      // hand-rolled network-first app-shell cache. Media still gets a runtime
      // cache so it survives offline after first view.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,jpg,png,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => ['image', 'font', 'audio', 'video'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'pl-media' },
          },
        ],
      },
      includeAssets: ['assets/icons/sprite.svg', 'assets/images/favicon.ico', 'assets/images/icon.jpg'],
      manifest: {
        name: 'Powerlifting Hub',
        short_name: 'PL Hub',
        start_url: './',
        display: 'standalone',
        background_color: '#121212',
        theme_color: '#121212',
        icons: [
          { src: 'assets/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: 'assets/images/icon.jpg', sizes: '192x192', type: 'image/jpeg' },
          { src: 'assets/images/favicon.ico', sizes: '64x64 32x32 24x24 16x16', type: 'image/x-icon' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.ts'],
  },
});
