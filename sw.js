/* نبض — Service Worker
   استراتيجية: الأصول المحلية من الكاش أولاً مع تحديث خلفي،
   والملاحة شبكة أولاً مع بديل من الكاش عند الانقطاع. */
'use strict';

var VERSION = 'nabd-v1';
var CORE = [
  './',
  './index.html',
  './how-to.html',
  './science.html',
  './about.html',
  './privacy.html',
  './terms.html',
  './css/style.css',
  './js/engine.js',
  './js/game.js',
  './assets/icon.svg',
  './manifest.webmanifest'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return cache.addAll(CORE);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== VERSION) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        var copy = response.clone();
        caches.open(VERSION).then(function (cache) { cache.put(request, copy); });
        return response;
      }).catch(function () {
        return caches.match(request).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (hit) {
      var network = fetch(request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(VERSION).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      }).catch(function () { return hit; });
      return hit || network;
    })
  );
});
