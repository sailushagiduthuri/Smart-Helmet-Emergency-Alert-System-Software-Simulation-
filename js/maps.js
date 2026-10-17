/**
 * SMART HELMET SAFETY SYSTEM - LEAFLET INTERACTIVE MAP CONTROLLER
 * Integrates Leaflet + OpenStreetMap with GPS geolocation, custom status pins, and Google Maps direct links.
 */

const MapController = {
  maps: {}, // Cache map instances by container ID
  markers: {},

  // Default coordinate fallback (San Francisco civic center)
  DEFAULT_COORDS: { lat: 37.7749, lng: -122.4194, name: 'San Francisco, CA' },

  // Initialize a Leaflet map
  init(containerId, initialCoords = null, zoom = 13) {
    const el = document.getElementById(containerId);
    if (!el) return null;

    // Check if already initialized on this container
    if (this.maps[containerId]) {
      this.maps[containerId].remove();
      delete this.maps[containerId];
      this.markers[containerId] = [];
    }

    const coords = initialCoords || this.DEFAULT_COORDS;

    // Dark-mode themed CartoDB / OpenStreetMap tiles
    const map = L.map(containerId, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([coords.lat, coords.lng], zoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    this.maps[containerId] = map;
    this.markers[containerId] = [];

    // Force Leaflet to recalculate container size
    setTimeout(() => map.invalidateSize(), 200);

    return map;
  },

  // Create custom HTML icon based on incident status / severity
  createMarkerIcon(status, severity) {
    let pinColor = '#ef4444'; // Red default
    let iconClass = 'fa-triangle-exclamation';

    if (status === 'Resolved') {
      pinColor = '#10b981';
      iconClass = 'fa-circle-check';
    } else if (status === 'Alert Acknowledged' || status === 'Acknowledged') {
      pinColor = '#f59e0b';
      iconClass = 'fa-clock';
    } else if (status === 'Assistance Required') {
      pinColor = '#a855f7';
      iconClass = 'fa-truck-medical';
    }

    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="
          width: 34px;
          height: 34px;
          background: ${pinColor};
          border: 2px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 0 15px ${pinColor};
          font-size: 14px;
          cursor: pointer;
        ">
          <i class="fa-solid ${iconClass}"></i>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -20]
    });
  },

  // Add Incident Marker to Map
  addIncidentMarker(containerId, incident) {
    const map = this.maps[containerId];
    if (!map || !incident.lat || !incident.lng) return null;

    const icon = this.createMarkerIcon(incident.status, incident.severity);
    const marker = L.marker([incident.lat, incident.lng], { icon }).addTo(map);

    const googleMapsUrl = `https://www.google.com/maps?q=${incident.lat},${incident.lng}`;
    const locationSourceBadge = incident.locationSource === 'Live Browser GPS' 
      ? '<span style="color:#10b981;font-weight:600;"><i class="fa-solid fa-satellite-dish"></i> Live Browser GPS</span>'
      : '<span style="color:#fbbf24;font-weight:600;"><i class="fa-solid fa-microchip"></i> Simulated Coordinates</span>';

    const popupHtml = `
      <div style="font-family: inherit; font-size: 13px; line-height: 1.5; min-width: 200px; color: #0f172a;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          ${Validator.sanitize(incident.type)}
        </div>
        <div style="margin-bottom: 4px;">
          <strong>Rider:</strong> ${Validator.sanitize(incident.riderName || 'Unknown')}
        </div>
        <div style="margin-bottom: 4px;">
          <strong>Status:</strong> ${incident.status}
        </div>
        <div style="margin-bottom: 4px;">
          <strong>Severity:</strong> ${incident.severity}
        </div>
        <div style="margin-bottom: 4px;">
          <strong>Time:</strong> ${UI.formatDate(incident.timestamp)}
        </div>
        <div style="margin-bottom: 4px; font-size: 11px;">
          <strong>Source:</strong> ${locationSourceBadge}
        </div>
        <div style="margin-bottom: 8px; font-family: monospace; font-size: 11px; color: #475569;">
          ${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}
        </div>
        <div>
          <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="
            display: inline-block;
            background: #0284c7;
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 4px;
            text-decoration: none;
            font-size: 11px;
            font-weight: 600;
          ">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Open in Google Maps
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    if (!this.markers[containerId]) this.markers[containerId] = [];
    this.markers[containerId].push(marker);

    return marker;
  },

  // Plot All Incidents on a Map
  plotAllIncidents(containerId, incidents) {
    const map = this.maps[containerId];
    if (!map) return;

    // Clear previous markers
    if (this.markers[containerId]) {
      this.markers[containerId].forEach(m => m.remove());
      this.markers[containerId] = [];
    }

    if (!incidents || incidents.length === 0) return;

    const bounds = [];
    incidents.forEach(inc => {
      if (Validator.isValidCoordinate(inc.lat, inc.lng)) {
        this.addIncidentMarker(containerId, inc);
        bounds.push([inc.lat, inc.lng]);
      }
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  },

  // Request Live Browser Geolocation
  getBrowserLocation() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'Live Browser GPS'
          });
        },
        (error) => {
          let msg = 'Failed to retrieve location.';
          if (error.code === error.PERMISSION_DENIED) {
            msg = 'Location permission was denied by the user.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            msg = 'Location information is currently unavailable.';
          } else if (error.code === error.TIMEOUT) {
            msg = 'Location request timed out.';
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }
};

window.MapController = MapController;
