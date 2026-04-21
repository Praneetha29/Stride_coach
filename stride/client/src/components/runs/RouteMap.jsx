import { useEffect, useRef } from 'react';

export default function RouteMap({ polyline }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!polyline || mapInstanceRef.current) return;

    import('leaflet').then(L => {
      import('leaflet/dist/leaflet.css');

      const coords = decodePolyline(polyline);
      if (!coords.length) return;

      const map = L.default.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      mapInstanceRef.current = map;

      // Minimal tile layer
      L.default.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Draw the route
      const line = L.default.polyline(coords, {
        color: '#D85A30',
        weight: 3,
        opacity: 0.9,
      }).addTo(map);

      // Start dot
      L.default.circleMarker(coords[0], {
        radius: 5,
        fillColor: '#D85A30',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(map);

      // End dot
      L.default.circleMarker(coords[coords.length - 1], {
        radius: 5,
        fillColor: '#1a1917',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(map);

      map.fitBounds(line.getBounds(), { padding: [16, 16] });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [polyline]);

  if (!polyline) {
    return (
      <div style={styles.empty}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>no route data</span>
      </div>
    );
  }

  return <div ref={mapRef} style={styles.map} />;
}

// Google's polyline decoding algorithm
function decodePolyline(encoded) {
  const coords = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;

    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;

    coords.push([lat / 1e5, lng / 1e5]);
  }

  return coords;
}

const styles = {
  map: {
    height: 200,
    borderRadius: 'var(--radius-md)',
    marginBottom: 14,
    overflow: 'hidden',
    border: '0.5px solid var(--color-border)',
  },
  empty: {
    height: 110,
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    border: '0.5px solid var(--color-border)',
  },
};