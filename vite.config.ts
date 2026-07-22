import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Pixel Mail',
        short_name: 'Pixel Mail',
        description: 'Correo electrónico profesional de Pixel',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#3B82F6', // Color principal real de Pixel Mail (#3B82F6)
        background_color: '#0F1117', // Fondo real de la pantalla inicial de Pixel Mail (#0F1117)
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
        skipWaiting: true,
        // Excluimos explícitamente llamadas privadas o dinámicas
        navigateFallbackDenylist: [
          /^\/__/, // Rutas internas de Firebase
          /^\/api/, // Llamadas locales a APIs o Cloud Functions
          /https:\/\/firebasestorage\.googleapis\.com/,
          /https:\/\/firestore\.googleapis\.com/,
          /https:\/\/resend\.com/
        ],
        runtimeCaching: [
          {
            // Cache First para recursos estáticos versionados y de terceros estables (ej. fuentes de Google si existieran o iconos de SVGs públicos)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff2?|eot|ttf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pixelmail-assets-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
              },
            },
          },
          {
            // NetworkOnly para endpoints privados de correos, autenticación, storage, funciones de base de datos
            urlPattern: ({ url }) => {
              return (
                url.hostname.includes('firestore.googleapis.com') ||
                url.hostname.includes('identitytoolkit.googleapis.com') ||
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
