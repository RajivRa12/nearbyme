// Deterministic small offset so stores that share exact seed coordinates
// don't render as a single overlapping pin.
function jitter(id: string | number) {
  const s = String(id);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  const a = (Math.abs(h) % 1000) / 1000 - 0.5;
  const b = (Math.abs(h >> 3) % 1000) / 1000 - 0.5;
  return { dLat: a * 0.01, dLng: b * 0.01 };
}

function parseLocation(loc?: string | null): { lat: number; lng: number } | null {
  if (!loc) return null;
  const [latStr, lngStr] = loc.split(",");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export type MapStore = { id: string | number; name: string; location?: string | null };
export type MapPoint = { id: string; name: string; lat: number; lng: number };

export function toMapPoints(stores: MapStore[]): MapPoint[] {
  return stores
    .map((s) => {
      const base = parseLocation(s.location);
      if (!base) return null;
      const { dLat, dLng } = jitter(s.id);
      return { id: String(s.id), name: s.name, lat: base.lat + dLat, lng: base.lng + dLng };
    })
    .filter(Boolean) as MapPoint[];
}

export function buildMapHtml(points: MapPoint[], centerOverride?: { lat: number; lng: number }): string {
  const center =
    centerOverride ??
    (points.length
      ? {
          lat: points.reduce((a, p) => a + p.lat, 0) / points.length,
          lng: points.reduce((a, p) => a + p.lng, 0) / points.length,
        }
      : { lat: 12.9716, lng: 77.5946 });
  const zoom = centerOverride ? 12 : points.length > 1 ? 13 : 14;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{height:100%;margin:0;padding:0;} .pin-label{font:600 11px -apple-system,sans-serif;color:#1C1B19;}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false }).setView([${center.lat}, ${center.lng}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    const icon = L.divIcon({
      className: '',
      html: '<div style="width:16px;height:16px;border-radius:9999px;background:#5C6F59;border:2.5px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35)"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    const points = ${JSON.stringify(points)};
    points.forEach(function(p) {
      const marker = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
      marker.bindTooltip(p.name, { direction: 'top', offset: [0, -6], className: 'pin-label' });
      marker.on('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ id: p.id }));
        } else if (window.parent) {
          window.parent.postMessage(JSON.stringify({ id: p.id }), '*');
        }
      });
    });
  </script>
</body>
</html>`;
}
