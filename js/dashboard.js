/**
 * SMART HELMET SAFETY SYSTEM - MAIN DASHBOARD CONTROLLER
 */

const DashboardController = {
  statsChart: null,

  init() {
    Auth.requireAuth();
    this.refreshDashboard();
    this.initMap();
    this.initChart();
    this.bindEvents();
  },

  // Refresh all stats, tables, and charts from current DB state
  refreshDashboard() {
    const stats = DB.getDashboardStats();

    // Update Counters
    const rdrEl = document.getElementById('statTotalRiders');
    const incEl = document.getElementById('statTotalIncidents');
    const alrEl = document.getElementById('statActiveAlerts');
    const resEl = document.getElementById('statResolvedIncidents');
    const hlmEl = document.getElementById('statConnectedHelmets');

    if (rdrEl) rdrEl.textContent = stats.totalRiders;
    if (incEl) incEl.textContent = stats.totalIncidents;
    if (alrEl) alrEl.textContent = stats.activeAlerts;
    if (resEl) resEl.textContent = stats.resolvedIncidents;
    if (hlmEl) hlmEl.textContent = `${stats.connectedHelmets}/${stats.totalHelmets}`;

    this.renderRecentIncidents();
    this.renderActivityLogs();
    this.updateMapMarkers();
    this.updateChartData();
  },

  // Initialize Leaflet Map
  initMap() {
    MapController.init('dashboardMap');
    this.updateMapMarkers();
  },

  updateMapMarkers() {
    const incidents = DB.getIncidents();
    MapController.plotAllIncidents('dashboardMap', incidents);
  },

  // Initialize Chart.js
  initChart() {
    const ctx = document.getElementById('dashboardIncidentChart');
    if (!ctx) return;

    const data = this.calculateChartData();

    this.statsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical Alerts', 'Moderate / Skid', 'SOS Panic', 'Resolved'],
        datasets: [{
          data: [data.critical, data.moderate, data.sos, data.resolved],
          backgroundColor: [
            '#ef4444', // Red
            '#f59e0b', // Amber
            '#a855f7', // Purple
            '#10b981'  // Emerald
          ],
          borderColor: '#111a2e',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 12 },
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: '#0a0f1d',
            titleColor: '#f8fafc',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(56, 189, 248, 0.2)',
            borderWidth: 1,
            padding: 10
          }
        },
        cutout: '68%'
      }
    });
  },

  calculateChartData() {
    const incidents = DB.getIncidents();
    let critical = 0;
    let moderate = 0;
    let sos = 0;
    let resolved = 0;

    incidents.forEach(inc => {
      if (inc.status === 'Resolved') {
        resolved++;
      } else if (inc.type && inc.type.includes('SOS')) {
        sos++;
      } else if (inc.severity === 'Critical') {
        critical++;
      } else {
        moderate++;
      }
    });

    return { critical, moderate, sos, resolved };
  },

  updateChartData() {
    if (!this.statsChart) return;
    const data = this.calculateChartData();
    this.statsChart.data.datasets[0].data = [data.critical, data.moderate, data.sos, data.resolved];
    this.statsChart.update();
  },

  // Render Recent Incidents Table
  renderRecentIncidents() {
    const tbody = document.getElementById('recentIncidentsTableBody');
    if (!tbody) return;

    const incidents = DB.getIncidents().slice(0, 5); // top 5

    if (incidents.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            <i class="fa-solid fa-shield-halved" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.4;"></i>
            No incidents recorded. System running clear.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = incidents.map(inc => `
      <tr>
        <td><strong>${Validator.sanitize(inc.id)}</strong></td>
        <td>
          <div style="font-weight: 600;">${Validator.sanitize(inc.riderName)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${UI.formatDate(inc.timestamp)}</div>
        </td>
        <td>${Validator.sanitize(inc.type)}</td>
        <td>${UI.renderSeverityBadge(inc.severity)}</td>
        <td>${UI.renderStatusBadge(inc.status)}</td>
        <td>
          <a href="incidents.html?id=${inc.id}" class="btn btn-outline btn-sm">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> View
          </a>
        </td>
      </tr>
    `).join('');
  },

  // Render Activity Log Stream
  renderActivityLogs() {
    const container = document.getElementById('recentActivityFeed');
    if (!container) return;

    const logs = DB.getActivityLogs().slice(0, 6);

    if (logs.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No recent activities logged.</p>`;
      return;
    }

    container.innerHTML = logs.map(l => `
      <div style="display: flex; gap: 0.85rem; align-items: flex-start; padding: 0.6rem 0; border-bottom: 1px solid rgba(56, 189, 248, 0.08);">
        <div class="stat-icon ${l.color || 'blue'}" style="width: 32px; height: 32px; font-size: 0.85rem; flex-shrink: 0;">
          <i class="fa-solid ${l.icon || 'fa-circle-info'}"></i>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 0.84rem; font-weight: 500; color: var(--text-primary);">${Validator.sanitize(l.description)}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${UI.timeAgo(l.timestamp)}</div>
        </div>
      </div>
    `).join('');
  },

  // Bind UI Events
  bindEvents() {
    // SOS Button Click -> Opens Confirmation Modal
    const sosBtn = document.getElementById('triggerSosBtn');
    if (sosBtn) {
      sosBtn.addEventListener('click', () => this.openSosModal());
    }

    // Modal SOS Confirm Button
    const confirmSosActionBtn = document.getElementById('confirmSosActionBtn');
    if (confirmSosActionBtn) {
      confirmSosActionBtn.addEventListener('click', () => this.executeSosSubmission());
    }

    // Reset Demo Data Button
    const resetBtn = document.getElementById('resetDemoDataBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        UI.confirm({
          title: '<i class="fa-solid fa-rotate-right" style="color:var(--warning);"></i> Reset Demo Data?',
          message: 'This will restore the original demo dataset (sample riders, helmets, incident logs, contacts). Any newly added custom records will be replaced with clean demo presets.',
          confirmText: 'Restore Defaults',
          confirmClass: 'btn-warning',
          onConfirm: () => {
            DB.resetToSeedData();
            this.refreshDashboard();
            UI.showToast('Demo data restored to initial state.', 'success');
          }
        });
      });
    }

    // Clear All Records Button
    const clearBtn = document.getElementById('clearAllDataBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        UI.confirm({
          title: '<i class="fa-solid fa-trash-can" style="color:var(--danger);"></i> Clear All Records?',
          message: 'Warning: This will wipe all local riders, helmets, contacts, and incident logs. You can always click "Reset Demo Data" to re-seed later.',
          confirmText: 'Wipe All Data',
          confirmClass: 'btn-danger',
          onConfirm: () => {
            DB.clearAllData();
            this.refreshDashboard();
            UI.showToast('All local storage records have been cleared.', 'warning');
          }
        });
      });
    }
  },

  // Open SOS Modal & populate riders
  async openSosModal() {
    const riderSelect = document.getElementById('sosRiderSelect');
    if (riderSelect) {
      const riders = DB.getRiders();
      riderSelect.innerHTML = riders.map(r => `
        <option value="${r.id}">${r.name} (${r.helmetId}) - Blood: ${r.bloodGroup || 'N/A'}</option>
      `).join('');
    }

    // Pre-populate GPS coordinates with browser geolocation if permitted
    const latInput = document.getElementById('sosLatitudeInput');
    const lngInput = document.getElementById('sosLongitudeInput');
    const statusNote = document.getElementById('sosLocationStatus');

    if (statusNote) statusNote.textContent = 'Acquiring GPS location...';

    try {
      const loc = await MapController.getBrowserLocation();
      if (latInput) latInput.value = loc.lat.toFixed(5);
      if (lngInput) lngInput.value = loc.lng.toFixed(5);
      if (statusNote) {
        statusNote.innerHTML = '<span style="color:#10b981;"><i class="fa-solid fa-check"></i> Live Browser GPS Acquired</span>';
      }
    } catch (err) {
      // Fallback coordinates (default SF center)
      if (latInput && !latInput.value) latInput.value = '37.7749';
      if (lngInput && !lngInput.value) lngInput.value = '-122.4194';
      if (statusNote) {
        statusNote.innerHTML = `<span style="color:#fbbf24;"><i class="fa-solid fa-triangle-exclamation"></i> GPS permission denied/unavailable. Using fallback coordinates.</span>`;
      }
    }

    UI.openModal('sosConfirmationModal');
  },

  // Execute SOS Submission
  executeSosSubmission() {
    const riderSelect = document.getElementById('sosRiderSelect');
    const latInput = document.getElementById('sosLatitudeInput');
    const lngInput = document.getElementById('sosLongitudeInput');
    const notesInput = document.getElementById('sosNotesInput');

    const riderId = riderSelect ? riderSelect.value : null;
    const rider = riderId ? DB.getRiderById(riderId) : null;
    const lat = parseFloat(latInput ? latInput.value : 37.7749);
    const lng = parseFloat(lngInput ? lngInput.value : -122.4194);
    const notes = notesInput ? notesInput.value.trim() : 'Manual SOS triggered via Dashboard Panic Button';

    if (!rider) {
      UI.showToast('Please select a valid rider.', 'danger');
      return;
    }

    // Sound audio alert beacon
    UI.playAlarmBeep();

    const incident = DB.saveIncident({
      riderId: rider.id,
      riderName: rider.name,
      type: 'SOS Panic Alert',
      severity: 'Critical',
      lat: isNaN(lat) ? 37.7749 : lat,
      lng: isNaN(lng) ? -122.4194 : lng,
      locationName: 'Emergency SOS Broadcast Point',
      locationSource: 'Browser Captured / Manual Input',
      status: 'New',
      notes: `${notes} | Emergency Contact: ${rider.emergencyContact} (${rider.emergencyPhone})`,
      sensorReading: { gForce: 1.0, speed: 0, angle: 0 }
    });

    UI.closeModal('sosConfirmationModal');
    this.refreshDashboard();

    // Trigger visual screen alarm flash briefly
    document.body.classList.add('emergency-alarm-active');
    setTimeout(() => document.body.classList.remove('emergency-alarm-active'), 3500);

    UI.showToast(
      `SOS Alert Broadcasted for ${rider.name}! Awaiting Emergency Assistance [${incident.id}].`,
      'danger',
      '🚨 EMERGENCY SOS DISPATCHED'
    );
  }
};

window.DashboardController = DashboardController;
document.addEventListener('DOMContentLoaded', () => {
  DashboardController.init();
});
