/* Service Worker der Lernplattform
   Aufgabe: Die App offline verfügbar halten — und trotzdem beim
   Neuladen sofort den neuesten Stand zeigen.

   Die App-Seite (index.html) kommt ZUERST AUS DEM NETZ; nur ohne Netz
   aus dem Speicher. Vorher war es umgekehrt (erst Speicher): Dann zeigte
   ein Neuladen nach einer Auslieferung noch den alten Stand, erst das
   zweite Neuladen den neuen. Dank `cache: "no-cache"` fragt der Browser
   den Server nur nach, ob sich etwas geändert hat — unverändert kostet das
   kaum Daten.

   Symbole und Manifest ändern sich selten und kommen aus dem Speicher.
   Der Cache-Name wird beim Bauen gesetzt; ein neuer räumt den alten weg. */
const CACHE = "lernplattform-v1.53-20261003-1112";
const DATEIEN = [
  "index.html",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-512-maskable.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(DATEIEN))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(namen => Promise.all(namen.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function istSeite(anfrage) {
  if (anfrage.mode === "navigate") return true;
  const pfad = new URL(anfrage.url).pathname;
  return pfad.endsWith("/") || pfad.endsWith("/index.html");
}

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (istSeite(e.request)) {
    /* Netz zuerst, Speicher als Rückfall. */
    e.respondWith(
      fetch(e.request, { cache: "no-cache" }).then(antwort => {
        if (antwort && antwort.status === 200) {
          const kopie = antwort.clone();
          caches.open(CACHE).then(c => c.put("index.html", kopie));
        }
        return antwort;
      }).catch(() => caches.match("index.html"))
    );
    return;
  }
  /* Alles andere: Speicher zuerst, sonst Netz (und ablegen). */
  e.respondWith(
    caches.match(e.request).then(treffer => {
      if (treffer) return treffer;
      return fetch(e.request).then(antwort => {
        if (antwort && antwort.status === 200 && antwort.type === "basic") {
          const kopie = antwort.clone();
          caches.open(CACHE).then(c => c.put(e.request, kopie));
        }
        return antwort;
      });
    })
  );
});
