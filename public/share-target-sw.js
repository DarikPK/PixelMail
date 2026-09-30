const PIXEL_SHARE_CACHE = 'pixelmail-share-target-v1';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'POST' || url.pathname !== '/share-target') {
    return;
  }

  event.respondWith((async () => {
    try {
      const formData = await event.request.formData();
      const rawFiles = formData.getAll('files');
      const files = rawFiles.filter((value) =>
        value && typeof value === 'object' && typeof value.arrayBuffer === 'function'
      );

      const sessionId = self.crypto?.randomUUID
        ? self.crypto.randomUUID()
        : `share-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const cache = await caches.open(PIXEL_SHARE_CACHE);
      const metadata = {
        sessionId,
        title: String(formData.get('title') || ''),
        text: String(formData.get('text') || ''),
        url: String(formData.get('url') || ''),
        createdAt: Date.now(),
        files: []
      };

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const key = `/__pixelmail-share/${sessionId}/${index}`;
        const absoluteKey = new URL(key, self.location.origin).toString();

        await cache.put(
          absoluteKey,
          new Response(file, {
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
              'X-Pixel-Filename': encodeURIComponent(file.name || `archivo-${index + 1}`)
            }
          })
        );

        metadata.files.push({
          cacheUrl: key,
          name: file.name || `archivo-${index + 1}`,
          type: file.type || 'application/octet-stream',
          size: Number(file.size || 0),
          lastModified: Number(file.lastModified || Date.now())
        });
      }

      const metaKey = new URL(`/__pixelmail-share-meta/${sessionId}`, self.location.origin).toString();
      await cache.put(
        metaKey,
        new Response(JSON.stringify(metadata), {
          headers: { 'Content-Type': 'application/json' }
        })
      );

      return Response.redirect(
        new URL(`/redactar?shareSession=${encodeURIComponent(sessionId)}`, self.location.origin).toString(),
        303
      );
    } catch (error) {
      return Response.redirect(
        new URL('/redactar?shareError=1', self.location.origin).toString(),
        303
      );
    }
  })());
});
