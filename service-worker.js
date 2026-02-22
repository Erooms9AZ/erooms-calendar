self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  // no-op: we’re not doing caching here
});
