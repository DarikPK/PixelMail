import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Pixel Mail decide cuándo activar una versión nueva para no interrumpir
      // redacciones, cargas, envíos o cambios sin guardar.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Pixel Mail',
        short_name: 'Pixel Mail',
        description: 'Correo electrónico profesional de Pixel',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#3B82F6',
        background_color: '#0F1117',
        lang: 'es-PE',
        categories: ['productivity', 'business', 'utilities'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Debe permanecer en false: la activación la controla PwaUpdateContext.
        skipWaiting: false,
        navigateFallbackDenylist: [
          /^\/__/,
          /^\/api/,
          /https:\/\/firebasestorage\.googleapis\.com/,
          /https:\/\/firestore\.googleapis\.com/,
          /https:\/\/resend\.com/
        ],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff2?|eot|ttf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pixelmail-assets-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            // Datos privados y operaciones dinámicas nunca se sirven desde Workbox.
            // Firestore maneja su propia caché persistente.
            urlPattern: ({ url }) => {
              return (
                url.hostname.includes('firestore.googleapis.com') ||
                url.hostname.includes('identitytoolkit.googleapis.com') ||
                url.hostname.includes('securetoken.googleapis.com') ||
                url.hostname.includes('firebasestorage.googleapis.com') ||
                url.pathname.includes('/sendEmail') ||
                url.pathname.includes('/getAttachment')
              );
            },
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
})
