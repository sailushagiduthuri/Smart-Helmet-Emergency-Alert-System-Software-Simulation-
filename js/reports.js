/**
 * SMART HELMET SAFETY SYSTEM - REPORTS & ANALYTICS CONTROLLER
 * Uses Chart.js to visualize live application records (trends, severities, types, rider breakdowns).
 */

const ReportsController = {
  trendChart: null,
  severityChart: null,
  typeChart: null,
  riderChart: null,

  init() {
    Auth.requireAuth();
    this.renderReports();
    this.bindEvents();
  },

  bindEvents() {
    const filter = document.getElementById('reportDateFilter');
    const exportBtn = document.getElementById('exportAnalyticsCsvBtn');

    if (filter) filter.addEventListener('change', () => this.renderReports());
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportAnalyticsCSV());
  },

  getFilteredIncidents() {
    const filter = document.getElementById('reportDateFilter')?.value || 'all';
    let incidents = DB.getIncidents();
    const now = Date.now();

    if (filter === '7days') {
      incidents = incidents.filter(i => (now - new Date(i.timestamp).getTime()) <= 7 * 86400000);
    } else if (filter === '30days') {
      incidents = incidents.filter(i => (now - new Date(i.timestamp).getTime()) <= 30 * 86400000);
    } else if (filter === '90days') {
      incidents = incidents.filter(i => (now - new Date(i.timestamp).getTime()) <= 90 * 86400000);
    }
    return incidents;
  },

  renderReports() {
    const incidents = this.getFilteredIncidents();

    // Summary Metric Badges
    const total = incidents.length;
    const resolved = incidents.filter(i => i.status === 'Resolved').length;
    const unresolved = total - resolved;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

    const totalEl = document.getElementById('repTotalIncidents');
    const resEl = document.getElementById('repResolvedIncidents');
    const unresEl = document.getElementById('repUnresolvedIncidents');
    const rateEl = document.getElementById('repResolutionRate');

    if (totalEl) totalEl.textContent = total;
    if (resEl) resEl.textContent = resolved;
    if (unresEl) unresEl.textContent = unresolved;
    if (rateEl) rateEl.textContent = `${resolutionRate}%`;

    this.renderTrendChart(incidents);
    this.renderSeverityChart(incidents);
    this.renderTypeChart(incidents);
    this.renderRiderBreakdown(incidents);
  },

  // 1. Incident Trend Over Time (Bar / Line)
  renderTrendChart(incidents) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    // Group incidents by date (YYYY-MM-DD)
    const countsByDate = {};
    // Seed last 7 days so chart isn't empty even with few points
    for (let d = 6; d >= 0; d--) {
      const dateKey = new Date(Date.now() - d * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      countsByDate[dateKey] = 0;
    }

    incidents.forEach(inc => {
      const dateKey = new Date(inc.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (countsByDate[dateKey] !== undefined) {
        countsByDate[dateKey]++;
      } else {
        countsByDate[dateKey] = 1;
      }
    });

    const labels = Object.keys(countsByDate);
    const data = Object.values(countsByDate);

    if (this.trendChart) this.trendChart.destroy();

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Incidents Occurred',
          data,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#0284c7',
          pointBorderColor: '#ffffff',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8' } }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8' }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          }
        }
      }
    });
  },

  // 2. Severity Breakdown (Doughnut)
  renderSeverityChart(incidents) {
    const ctx = document.getElementById('severityChart');
    if (!ctx) return;

    let critical = 0, warning = 0, low = 0;
    incidents.forEach(i => {
      if (i.severity === 'Critical') critical++;
      else if (i.severity === 'Medium' || i.severity === 'High') warning++;
      else low++;
    });

    if (this.severityChart) this.severityChart.destroy();

    this.severityChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical (High G-Force)', 'Moderate / Warning', 'Low Impact'],
        datasets: [{
          data: [critical, warning, low],
          backgroundColor: ['#ef4444', '#f59e0b', '#38bdf8'],
          borderColor: '#111a2e',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 15 } }
        },
        cutout: '65%'
      }
    });
  },

  // 3. Incident Type Distribution (Bar)
  renderTypeChart(incidents) {
    const ctx = document.getElementById('typeChart');
    if (!ctx) return;

    const typeCounts = {};
    incidents.forEach(i => {
      const typeKey = i.type || 'Unspecified';
      typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;
    });

    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);

    if (this.typeChart) this.typeChart.destroy();

    this.typeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Incident Count',
          data,
          backgroundColor: '#0284c7',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          }
        }
      }
    });
  },

  // 4. Rider-wise Incident Table Breakdown
  renderRiderBreakdown(incidents) {
    const tbody = document.getElementById('riderBreakdownTableBody');
    if (!tbody) return;

    const riders = DB.getRiders();
    const statsByRider = {};

    riders.forEach(r => {
      statsByRider[r.id] = {
        name: r.name,
        helmetId: r.helmetId,
        bloodGroup: r.bloodGroup || 'N/A',
        total: 0,
        critical: 0,
        resolved: 0
      };
    });

    incidents.forEach(i => {
      if (statsByRider[i.riderId]) {
        statsByRider[i.riderId].total++;
        if (i.severity === 'Critical') statsByRider[i.riderId].critical++;
        if (i.status === 'Resolved') statsByRider[i.riderId].resolved++;
      }
    });

    const rows = Object.values(statsByRider);

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No rider data available.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>
          <strong>${Validator.sanitize(r.name)}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${r.helmetId}</div>
        </td>
        <td><span class="badge badge-neutral">${r.bloodGroup}</span></td>
        <td><strong>${r.total}</strong></td>
        <td><span class="badge ${r.critical > 0 ? 'badge-critical' : 'badge-neutral'}">${r.critical}</span></td>
        <td><span class="badge badge-resolved">${r.resolved}</span></td>
      </tr>
    `).join('');
  },

  // Export Analytics CSV
  exportAnalyticsCSV() {
    const incidents = this.getFilteredIncidents();
    const headers = ['Metric', 'Value'];
    const total = incidents.length;
    const resolved = incidents.filter(i => i.status === 'Resolved').length;
    const critical = incidents.filter(i => i.severity === 'Critical').length;

    const data = [
      ['Report Generated', new Date().toISOString()],
      ['Total Incidents', total],
      ['Resolved Incidents', resolved],
      ['Unresolved Incidents', total - resolved],
      ['Critical Incidents', critical]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...data.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smart_helmet_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    UI.showToast('Analytics summary exported to CSV.', 'success');
  }
};

window.ReportsController = ReportsController;
document.addEventListener('DOMContentLoaded', () => {
  ReportsController.init();
});
