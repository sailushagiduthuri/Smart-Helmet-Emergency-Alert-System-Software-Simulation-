/**
 * SMART HELMET SAFETY SYSTEM - INCIDENT HISTORY & TRIAGE CONTROLLER
 * Filterable incident ledger, status lifecycle, map popup, and CSV export.
 */

const IncidentsController = {
  activeIncidentId: null,
  detailMap: null,
  currentPage: 1,
  pageSize: 8,

  init() {
    Auth.requireAuth();
    this.checkUrlForIncident();
    this.renderIncidents();
    this.bindEvents();
  },

  // Check if ?id=INC-xxx was passed via URL parameter to auto-open details
  checkUrlForIncident() {
    const params = new URLSearchParams(window.location.search);
    const incId = params.get('id');
    if (incId) {
      setTimeout(() => this.openDetailsModal(incId), 300);
    }
  },

  renderIncidents() {
    const tbody = document.getElementById('incidentsTableBody');
    if (!tbody) return;

    const search = (document.getElementById('incidentSearchInput')?.value || '').toLowerCase().trim();
    const typeFilter = document.getElementById('incidentTypeFilter')?.value || '';
    const severityFilter = document.getElementById('severityFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const dateRangeFilter = document.getElementById('dateRangeFilter')?.value || 'all';

    let incidents = DB.getIncidents();

    // Text Search
    if (search) {
      incidents = incidents.filter(i => 
        (i.id && i.id.toLowerCase().includes(search)) ||
        (i.riderName && i.riderName.toLowerCase().includes(search)) ||
        (i.type && i.type.toLowerCase().includes(search)) ||
        (i.locationName && i.locationName.toLowerCase().includes(search))
      );
    }

    // Type Filter
    if (typeFilter) {
      incidents = incidents.filter(i => i.type && i.type.includes(typeFilter));
    }

    // Severity Filter
    if (severityFilter) {
      incidents = incidents.filter(i => i.severity === severityFilter);
    }

    // Status Filter
    if (statusFilter) {
      incidents = incidents.filter(i => i.status === statusFilter);
    }

    // Date Range Filter
    const now = Date.now();
    if (dateRangeFilter === 'today') {
      incidents = incidents.filter(i => (now - new Date(i.timestamp).getTime()) <= 86400000);
    } else if (dateRangeFilter === '7days') {
      incidents = incidents.filter(i => (now - new Date(i.timestamp).getTime()) <= 7 * 86400000);
    } else if (dateRangeFilter === '30days') {
      incidents = incidents.filter(i => (now - new Date(i.timestamp).getTime()) <= 30 * 86400000);
    }

    // Counter Badge
    const counterBadge = document.getElementById('incidentCountBadge');
    if (counterBadge) counterBadge.textContent = `${incidents.length} Records Found`;

    // Pagination
    const totalRecords = incidents.length;
    const totalPages = Math.ceil(totalRecords / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const paginated = incidents.slice(startIndex, startIndex + this.pageSize);

    this.renderPaginationControls(totalPages);

    if (paginated.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 0.5rem; display: block; opacity: 0.4;"></i>
            No incident records match the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = paginated.map(inc => `
      <tr>
        <td><strong>${Validator.sanitize(inc.id)}</strong></td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary);">${Validator.sanitize(inc.riderName)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${Validator.sanitize(inc.riderId || 'N/A')}</div>
        </td>
        <td>
          <span style="font-weight: 500;">${Validator.sanitize(inc.type)}</span>
        </td>
        <td>
          <div style="font-size: 0.85rem;">${UI.formatDate(inc.timestamp)}</div>
          <div style="font-size: 0.74rem; color: var(--text-muted);">${UI.timeAgo(inc.timestamp)}</div>
        </td>
        <td>
          <div style="max-width: 170px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.82rem;" title="${Validator.sanitize(inc.locationName || '')}">
            <i class="fa-solid fa-location-dot" style="color:var(--accent-cyan); font-size: 0.75rem;"></i>
            ${Validator.sanitize(inc.locationName || 'GPS Point')}
          </div>
          <div style="font-family: monospace; font-size: 0.72rem; color: var(--text-muted);">
            ${inc.lat ? inc.lat.toFixed(4) : '--'}, ${inc.lng ? inc.lng.toFixed(4) : '--'}
          </div>
        </td>
        <td>${UI.renderSeverityBadge(inc.severity)}</td>
        <td>${UI.renderStatusBadge(inc.status)}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-outline btn-sm" onclick="IncidentsController.openDetailsModal('${inc.id}')" title="Inspect & Update Status">
              <i class="fa-solid fa-eye"></i> Triage
            </button>
            <button class="btn btn-outline btn-sm" style="color:#f87171;" onclick="IncidentsController.confirmDelete('${inc.id}')" title="Delete Record">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  renderPaginationControls(totalPages) {
    const container = document.getElementById('paginationControls');
    if (!container) return;

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 1rem;">
        <span style="font-size: 0.82rem; color: var(--text-muted);">Page ${this.currentPage} of ${totalPages}</span>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-outline btn-sm" ${this.currentPage === 1 ? 'disabled' : ''} onclick="IncidentsController.changePage(${this.currentPage - 1})">
            <i class="fa-solid fa-chevron-left"></i> Prev
          </button>
          <button class="btn btn-outline btn-sm" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="IncidentsController.changePage(${this.currentPage + 1})">
            Next <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    `;
  },

  changePage(page) {
    this.currentPage = page;
    this.renderIncidents();
  },

  bindEvents() {
    const searchInput = document.getElementById('incidentSearchInput');
    const typeFilter = document.getElementById('incidentTypeFilter');
    const severityFilter = document.getElementById('severityFilter');
    const statusFilter = document.getElementById('statusFilter');
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const saveStatusBtn = document.getElementById('saveIncidentStatusBtn');

    if (searchInput) searchInput.addEventListener('input', () => { this.currentPage = 1; this.renderIncidents(); });
    if (typeFilter) typeFilter.addEventListener('change', () => { this.currentPage = 1; this.renderIncidents(); });
    if (severityFilter) severityFilter.addEventListener('change', () => { this.currentPage = 1; this.renderIncidents(); });
    if (statusFilter) statusFilter.addEventListener('change', () => { this.currentPage = 1; this.renderIncidents(); });
    if (dateRangeFilter) dateRangeFilter.addEventListener('change', () => { this.currentPage = 1; this.renderIncidents(); });
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => this.exportToCSV());
    if (saveStatusBtn) saveStatusBtn.addEventListener('click', () => this.handleStatusUpdate());
  },

  openDetailsModal(id) {
    const inc = DB.getIncidentById(id);
    if (!inc) return;

    this.activeIncidentId = id;
    const rider = DB.getRiderById(inc.riderId);

    // Populate modal text fields
    document.getElementById('modalIncidentId').textContent = inc.id;
    document.getElementById('modalRiderName').textContent = inc.riderName || 'Unknown';
    document.getElementById('modalIncidentType').textContent = inc.type;
    document.getElementById('modalTimestamp').textContent = UI.formatDate(inc.timestamp);
    document.getElementById('modalSeverity').innerHTML = UI.renderSeverityBadge(inc.severity);
    document.getElementById('modalCoordinates').textContent = `${inc.lat.toFixed(5)}, ${inc.lng.toFixed(5)}`;
    document.getElementById('modalLocationSource').textContent = inc.locationSource || 'Simulated Coordinates';
    document.getElementById('modalEmergencyContact').textContent = 
      rider ? `${rider.emergencyContact} (${rider.emergencyPhone})` : (inc.notes || 'Emergency contact on file');

    // Telemetry if present
    const telEl = document.getElementById('modalTelemetrySummary');
    if (telEl) {
      if (inc.sensorReading) {
        telEl.textContent = `Impact G-Force: ${inc.sensorReading.gForce}G | Speed: ${inc.sensorReading.speed} km/h | Tilt: ${inc.sensorReading.angle}°`;
      } else {
        telEl.textContent = 'Standard SOS transmission beacon';
      }
    }

    // Set select to current status
    const statusSelect = document.getElementById('modalStatusSelect');
    if (statusSelect) statusSelect.value = inc.status;

    // Google Maps external link
    const gMapsLink = document.getElementById('modalGoogleMapsLink');
    if (gMapsLink) {
      gMapsLink.href = `https://www.google.com/maps?q=${inc.lat},${inc.lng}`;
    }

    UI.openModal('incidentDetailsModal');

    // Initialize Modal Leaflet map
    setTimeout(() => {
      MapController.init('incidentDetailMap', { lat: inc.lat, lng: inc.lng }, 15);
      MapController.addIncidentMarker('incidentDetailMap', inc);
    }, 250);
  },

  handleStatusUpdate() {
    if (!this.activeIncidentId) return;

    const newStatus = document.getElementById('modalStatusSelect').value;
    const resolutionNote = document.getElementById('modalResolutionNotes')?.value.trim() || '';

    DB.updateIncidentStatus(this.activeIncidentId, newStatus, resolutionNote);
    UI.closeModal('incidentDetailsModal');
    this.renderIncidents();
    UI.showToast(`Incident ${this.activeIncidentId} status updated to: ${newStatus}`, 'success');
  },

  confirmDelete(id) {
    UI.confirm({
      title: '<i class="fa-solid fa-trash" style="color:var(--danger);"></i> Delete Incident Record?',
      message: `Are you sure you want to permanently delete incident record <strong>${id}</strong>?`,
      confirmText: 'Delete Record',
      confirmClass: 'btn-danger',
      onConfirm: () => {
        DB.deleteIncident(id);
        this.renderIncidents();
        UI.showToast(`Incident ${id} deleted.`, 'warning');
      }
    });
  },

  // Export Table Data to CSV (Requirement 4.I)
  exportToCSV() {
    const incidents = DB.getIncidents();
    if (incidents.length === 0) {
      UI.showToast('No incidents to export.', 'warning');
      return;
    }

    const headers = ['Incident ID', 'Rider ID', 'Rider Name', 'Incident Type', 'Severity', 'Status', 'Timestamp', 'Latitude', 'Longitude', 'Location Source', 'Notes'];
    
    const rows = incidents.map(i => [
      `"${i.id}"`,
      `"${i.riderId || ''}"`,
      `"${(i.riderName || '').replace(/"/g, '""')}"`,
      `"${(i.type || '').replace(/"/g, '""')}"`,
      `"${i.severity}"`,
      `"${i.status}"`,
      `"${i.timestamp}"`,
      i.lat || '',
      i.lng || '',
      `"${(i.locationSource || '').replace(/"/g, '""')}"`,
      `"${(i.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smart_helmet_incidents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    UI.showToast(`Exported ${incidents.length} incident records to CSV.`, 'success');
  }
};

window.IncidentsController = IncidentsController;
document.addEventListener('DOMContentLoaded', () => {
  IncidentsController.init();
});
