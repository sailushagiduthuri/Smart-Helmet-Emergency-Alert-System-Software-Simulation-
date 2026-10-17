/**
 * SMART HELMET SAFETY SYSTEM - SENSOR SIMULATOR & MONITORING CONTROLLER
 * Simulates helmet telemetry (3-axis accelerometer, impact G-force, infrared wear sensor)
 * All readings are purely simulated for educational and demonstration purposes.
 */

const MonitoringController = {
  isMonitoring: false,
  timerId: null,
  isAccidentTriggering: false, // Prevents duplicate submissions
  selectedHelmetId: 'HLM-8088',
  selectedRider: null,

  currentTelemetry: {
    gForce: 1.02,
    accelX: 0.05,
    accelY: 0.12,
    accelZ: 0.98,
    speed: 0,
    isWorn: true,
    isConnected: true,
    impactLevel: 'Normal',
    lastUpdated: new Date()
  },

  init() {
    Auth.requireAuth();
    this.populateRiderSelector();
    this.bindEvents();
    this.renderTelemetryUI();

    // Window unload cleanup to guarantee no leaked timers
    window.addEventListener('beforeunload', () => {
      this.stopMonitoring();
    });
  },

  populateRiderSelector() {
    const select = document.getElementById('monitorRiderSelect');
    if (!select) return;

    const riders = DB.getRiders();
    if (riders.length === 0) {
      select.innerHTML = '<option value="">No riders registered</option>';
      return;
    }

    select.innerHTML = riders.map(r => `
      <option value="${r.id}" data-helmet="${r.helmetId}">${r.name} (${r.helmetId})</option>
    `).join('');

    this.updateActiveRider();
  },

  updateActiveRider() {
    const select = document.getElementById('monitorRiderSelect');
    if (!select || !select.value) return;

    this.selectedRider = DB.getRiderById(select.value);
    if (this.selectedRider) {
      this.selectedHelmetId = this.selectedRider.helmetId;
      const hBadge = document.getElementById('activeHelmetBadge');
      if (hBadge) hBadge.textContent = this.selectedHelmetId;
    }
  },

  bindEvents() {
    const startBtn = document.getElementById('startMonitoringBtn');
    const stopBtn = document.getElementById('stopMonitoringBtn');
    const triggerCrashBtn = document.getElementById('simulateCrashBtn');
    const toggleConnectBtn = document.getElementById('toggleConnectionBtn');
    const toggleWearBtn = document.getElementById('toggleWearBtn');
    const riderSelect = document.getElementById('monitorRiderSelect');

    if (startBtn) startBtn.addEventListener('click', () => this.startMonitoring());
    if (stopBtn) stopBtn.addEventListener('click', () => this.stopMonitoring());
    if (triggerCrashBtn) triggerCrashBtn.addEventListener('click', () => this.simulateAccident());
    if (toggleConnectBtn) toggleConnectBtn.addEventListener('click', () => this.toggleConnection());
    if (toggleWearBtn) toggleWearBtn.addEventListener('click', () => this.toggleWearStatus());

    if (riderSelect) {
      riderSelect.addEventListener('change', () => {
        this.updateActiveRider();
        UI.showToast(`Active monitoring target switched to ${this.selectedRider.name}.`, 'info');
      });
    }
  },

  startMonitoring() {
    if (this.isMonitoring) return;

    if (!this.currentTelemetry.isConnected) {
      UI.showToast('Cannot start monitoring: Helmet is currently Disconnected. Reconnect helmet first.', 'warning');
      return;
    }

    this.isMonitoring = true;
    this.updateControlsState();
    UI.showToast('Real-time simulated telemetry stream started (interval: 1.5s).', 'success');
    DB.logActivity('MONITOR_START', `Live simulated monitoring started for helmet ${this.selectedHelmetId}`, 'fa-play', 'info');

    // Run interval updates
    this.timerId = setInterval(() => {
      this.generateSimulatedTick();
    }, 1500);
  },

  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.updateControlsState();
    UI.showToast('Monitoring stopped. Sensor timers cleared.', 'info');
    DB.logActivity('MONITOR_STOP', `Monitoring halted for helmet ${this.selectedHelmetId}`, 'fa-stop', 'info');
  },

  updateControlsState() {
    const startBtn = document.getElementById('startMonitoringBtn');
    const stopBtn = document.getElementById('stopMonitoringBtn');
    const statusPill = document.getElementById('monitoringStatePill');

    if (startBtn) startBtn.disabled = this.isMonitoring;
    if (stopBtn) stopBtn.disabled = !this.isMonitoring;

    if (statusPill) {
      if (this.isMonitoring) {
        statusPill.innerHTML = '<span class="status-dot"></span> Active Simulation';
        statusPill.style.color = '#34d399';
        statusPill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      } else {
        statusPill.innerHTML = '<span class="status-dot warning"></span> Idle / Paused';
        statusPill.style.color = '#fbbf24';
        statusPill.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      }
    }
  },

  toggleConnection() {
    this.currentTelemetry.isConnected = !this.currentTelemetry.isConnected;
    if (!this.currentTelemetry.isConnected && this.isMonitoring) {
      this.stopMonitoring();
    }
    this.renderTelemetryUI();
    const stateMsg = this.currentTelemetry.isConnected ? 'Connected' : 'Disconnected';
    UI.showToast(`Helmet status changed to: ${stateMsg}`, this.currentTelemetry.isConnected ? 'success' : 'warning');
    DB.logActivity('HELMET_STATE', `Helmet ${this.selectedHelmetId} switched to ${stateMsg}`, 'fa-satellite-dish', 'info');
  },

  toggleWearStatus() {
    this.currentTelemetry.isWorn = !this.currentTelemetry.isWorn;
    this.renderTelemetryUI();
    const stateMsg = this.currentTelemetry.isWorn ? 'Worn on Head (Proximity OK)' : 'Helmet Removed (Proximity Lost)';
    UI.showToast(`Infrared sensor update: ${stateMsg}`, this.currentTelemetry.isWorn ? 'success' : 'warning');
  },

  // Generate realistic motorcycle cruise fluctuations
  generateSimulatedTick() {
    if (!this.isMonitoring || !this.currentTelemetry.isConnected) return;

    // Normal cruising G-force fluctuates around 1.0G (earth gravity) +/- 0.15G
    const jitterX = (Math.random() - 0.5) * 0.25;
    const jitterY = (Math.random() - 0.5) * 0.25;
    const jitterZ = 0.95 + (Math.random() - 0.5) * 0.15;
    const netG = Math.sqrt(jitterX * jitterX + jitterY * jitterY + jitterZ * jitterZ);

    // Speed fluctuation 35-55 km/h
    const baseSpeed = 45;
    const currentSpeed = Math.max(0, Math.round(baseSpeed + (Math.random() - 0.5) * 12));

    this.currentTelemetry = {
      ...this.currentTelemetry,
      accelX: parseFloat(jitterX.toFixed(2)),
      accelY: parseFloat(jitterY.toFixed(2)),
      accelZ: parseFloat(jitterZ.toFixed(2)),
      gForce: parseFloat(netG.toFixed(2)),
      speed: currentSpeed,
      impactLevel: netG > 4.0 ? 'Critical' : (netG > 2.0 ? 'Warning' : 'Normal'),
      lastUpdated: new Date()
    };

    this.renderTelemetryUI();
  },

  // Render Telemetry values onto DOM
  renderTelemetryUI() {
    const gForceEl = document.getElementById('telemetryGForce');
    const speedEl = document.getElementById('telemetrySpeed');
    const accelXEl = document.getElementById('telemetryAccelX');
    const accelYEl = document.getElementById('telemetryAccelY');
    const accelZEl = document.getElementById('telemetryAccelZ');
    const barX = document.getElementById('barAccelX');
    const barY = document.getElementById('barAccelY');
    const barZ = document.getElementById('barAccelZ');
    const connEl = document.getElementById('telemetryConnectionBadge');
    const wearEl = document.getElementById('telemetryWearBadge');
    const impactEl = document.getElementById('telemetryImpactLevel');
    const timeEl = document.getElementById('telemetryLastUpdated');

    const t = this.currentTelemetry;

    if (gForceEl) gForceEl.textContent = `${t.gForce.toFixed(2)} G`;
    if (speedEl) speedEl.textContent = `${t.speed} km/h`;
    if (accelXEl) accelXEl.textContent = `${t.accelX >= 0 ? '+' : ''}${t.accelX} G`;
    if (accelYEl) accelYEl.textContent = `${t.accelY >= 0 ? '+' : ''}${t.accelY} G`;
    if (accelZEl) accelZEl.textContent = `${t.accelZ >= 0 ? '+' : ''}${t.accelZ} G`;

    // Normalize bar percentages (0 to 2G normal scale)
    if (barX) barX.style.width = `${Math.min(100, Math.abs(t.accelX) * 50)}%`;
    if (barY) barY.style.width = `${Math.min(100, Math.abs(t.accelY) * 50)}%`;
    if (barZ) barZ.style.width = `${Math.min(100, Math.abs(t.accelZ) * 50)}%`;

    if (connEl) {
      connEl.className = t.isConnected ? 'badge badge-resolved' : 'badge badge-critical';
      connEl.innerHTML = t.isConnected 
        ? '<i class="fa-solid fa-link"></i> Connected' 
        : '<i class="fa-solid fa-link-slash"></i> Disconnected';
    }

    if (wearEl) {
      wearEl.className = t.isWorn ? 'badge badge-resolved' : 'badge badge-warning';
      wearEl.innerHTML = t.isWorn 
        ? '<i class="fa-solid fa-head-side-mask"></i> Worn on Head' 
        : '<i class="fa-solid fa-circle-exclamation"></i> Helmet Removed';
    }

    if (impactEl) {
      if (t.impactLevel === 'Critical') {
        impactEl.className = 'badge badge-critical';
        impactEl.textContent = 'CRITICAL IMPACT DETECTED';
      } else if (t.impactLevel === 'Warning') {
        impactEl.className = 'badge badge-warning';
        impactEl.textContent = 'HIGH G-FORCE SPIKE';
      } else {
        impactEl.className = 'badge badge-resolved';
        impactEl.textContent = 'NORMAL OPERATING RANGE';
      }
    }

    if (timeEl) {
      timeEl.textContent = t.lastUpdated.toLocaleTimeString();
    }
  },

  // ACCIDENT DETECTION SIMULATION (Requirement 4.F)
  async simulateAccident() {
    // Prevent duplicate submissions from repeated clicks
    if (this.isAccidentTriggering) {
      UI.showToast('Accident simulation already in progress. Please wait...', 'warning');
      return;
    }

    if (!this.selectedRider) {
      this.updateActiveRider();
      if (!this.selectedRider) {
        UI.showToast('Please register or select a rider first.', 'danger');
        return;
      }
    }

    this.isAccidentTriggering = true;
    const triggerBtn = document.getElementById('simulateCrashBtn');
    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Simulating Impact...';
    }

    // 1. Generate peak simulated impact telemetry (e.g. 6.9G crash shockwave)
    const simulatedPeakG = parseFloat((5.5 + Math.random() * 2.5).toFixed(2));
    this.currentTelemetry = {
      ...this.currentTelemetry,
      gForce: simulatedPeakG,
      accelX: 4.8,
      accelY: -3.6,
      accelZ: 5.1,
      speed: 0,
      impactLevel: 'Critical',
      lastUpdated: new Date()
    };
    this.renderTelemetryUI();

    // 2. Play audible alarm synthesizer
    UI.playAlarmBeep();

    // 3. Screen flash alert
    document.body.classList.add('emergency-alarm-active');
    setTimeout(() => document.body.classList.remove('emergency-alarm-active'), 4000);

    // 4. Attempt to retrieve real location or fallback safely
    let coordinates = { lat: 37.7749, lng: -122.4194, source: 'Simulated Demo Coordinates' };
    try {
      const liveLoc = await MapController.getBrowserLocation();
      coordinates = {
        lat: liveLoc.lat,
        lng: liveLoc.lng,
        source: 'Live Browser GPS'
      };
    } catch (e) {
      console.log('Using simulated coordinate fallback:', e.message);
    }

    // 5. Create unique incident record
    const incidentId = 'INC-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);
    const incidentData = {
      id: incidentId,
      riderId: this.selectedRider.id,
      riderName: this.selectedRider.name,
      type: 'Simulated Severe Crash / Impact Spike',
      severity: 'Critical',
      timestamp: new Date().toISOString(),
      lat: coordinates.lat,
      lng: coordinates.lng,
      locationName: coordinates.source === 'Live Browser GPS' ? 'Browser Detected Location' : 'Civic Safety Test Corridor',
      locationSource: coordinates.source,
      status: 'New',
      notes: `SIMULATED IMPACT: Sensor registered ${simulatedPeakG}G shockwave at 0 km/h deceleration. Contact: ${this.selectedRider.emergencyContact} (${this.selectedRider.emergencyPhone})`,
      isSimulated: true,
      sensorReading: {
        gForce: simulatedPeakG,
        speed: 0,
        angle: 78
      }
    };

    const savedIncident = DB.saveIncident(incidentData);

    // 6. Display dedicated emergency warning modal with options to view, acknowledge, or resolve
    this.showAccidentResultModal(savedIncident);

    // Reset button debounce state
    setTimeout(() => {
      this.isAccidentTriggering = false;
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = '<i class="fa-solid fa-burst"></i> Simulate Accident';
      }
    }, 1500);
  },

  // Show Accident Alert Modal with Acknowledge and Resolve actions
  showAccidentResultModal(incident) {
    let modalEl = document.getElementById('accidentAlertModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'accidentAlertModal';
      modalEl.className = 'modal-overlay';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-container" style="border-color: var(--danger); box-shadow: var(--shadow-glow-red);">
        <div class="modal-header" style="background: rgba(239, 68, 68, 0.15);">
          <h3 class="modal-title" style="color: #f87171;">
            <i class="fa-solid fa-triangle-exclamation"></i> SIMULATED ACCIDENT DETECTED
          </h3>
          <button type="button" class="modal-close-btn" onclick="UI.closeModal('accidentAlertModal')">&times;</button>
        </div>
        <div class="modal-body">
          <div class="sim-notice-banner" style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #fca5a5;">
            <i class="fa-solid fa-circle-info"></i>
            <div><strong>Simulation Notice:</strong> This is an algorithmic demonstration incident generated without physical sensors.</div>
          </div>
          <div style="background: rgba(15, 23, 42, 0.6); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1rem; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="color: var(--text-muted); font-size: 0.85rem;">Incident ID:</span>
              <strong style="color: var(--accent-cyan);">${incident.id}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="color: var(--text-muted); font-size: 0.85rem;">Rider:</span>
              <strong>${Validator.sanitize(incident.riderName)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="color: var(--text-muted); font-size: 0.85rem;">Peak Simulated Impact:</span>
              <span class="badge badge-critical">${incident.sensorReading.gForce} G</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span style="color: var(--text-muted); font-size: 0.85rem;">Coordinates:</span>
              <span style="font-family: monospace; font-size: 0.85rem;">${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted); font-size: 0.85rem;">Location Source:</span>
              <span style="font-size: 0.8rem; color: #38bdf8;">${incident.locationSource}</span>
            </div>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">
            An emergency alert dispatch record has been saved to persistent storage. What action would you like to take?
          </p>
        </div>
        <div class="modal-footer" style="flex-wrap: wrap; gap: 0.5rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="UI.closeModal('accidentAlertModal')">Close</button>
          <button type="button" class="btn btn-warning btn-sm" id="btnAckIncident">
            <i class="fa-solid fa-clock"></i> Acknowledge Alert
          </button>
          <button type="button" class="btn btn-success btn-sm" id="btnResolveIncident">
            <i class="fa-solid fa-circle-check"></i> Mark Resolved
          </button>
          <a href="incidents.html?id=${incident.id}" class="btn btn-primary btn-sm">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Full Details
          </a>
        </div>
      </div>
    `;

    document.getElementById('btnAckIncident').onclick = () => {
      DB.updateIncidentStatus(incident.id, 'Alert Acknowledged');
      UI.closeModal('accidentAlertModal');
      UI.showToast(`Incident ${incident.id} marked as Acknowledged. Dispatch in progress.`, 'warning');
    };

    document.getElementById('btnResolveIncident').onclick = () => {
      DB.updateIncidentStatus(incident.id, 'Resolved', 'Resolved by operator from monitoring console');
      UI.closeModal('accidentAlertModal');
      UI.showToast(`Incident ${incident.id} marked as Resolved.`, 'success');
    };

    UI.openModal('accidentAlertModal');
  }
};

window.MonitoringController = MonitoringController;
document.addEventListener('DOMContentLoaded', () => {
  MonitoringController.init();
});
