/**
 * SMART HELMET SAFETY SYSTEM - UI CONTROLLER & NOTIFICATIONS
 */

const UI = {
  // Sound synthesizer for emergency alarm beeps (Web Audio API)
  audioCtx: null,

  playAlarmBeep() {
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContext();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.3); // Drop to A4

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio alert not allowed or supported:', e);
    }
  },

  // Show Toast
  showToast(message, type = 'info', title = null) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'danger') iconClass = 'fa-triangle-exclamation';
    if (type === 'warning') iconClass = 'fa-bell';

    const defaultTitle = {
      success: 'Success',
      danger: 'Emergency Alert',
      warning: 'Warning',
      info: 'Notification'
    }[type];

    toast.innerHTML = `
      <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${title || defaultTitle}</div>
        <div class="toast-message">${Validator.sanitize(message)}</div>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  },

  // Reusable confirmation modal
  confirm({ title, message, confirmText = 'Confirm', confirmClass = 'btn-primary', onConfirm }) {
    let modalEl = document.getElementById('globalConfirmModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'globalConfirmModal';
      modalEl.className = 'modal-overlay';
      modalEl.innerHTML = `
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title" id="confirmModalTitle"></h3>
            <button type="button" class="modal-close-btn" id="confirmModalClose">&times;</button>
          </div>
          <div class="modal-body">
            <p id="confirmModalBody" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;"></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="confirmModalCancel">Cancel</button>
            <button type="button" class="btn" id="confirmModalAction"></button>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);
    }

    const titleEl = document.getElementById('confirmModalTitle');
    const bodyEl = document.getElementById('confirmModalBody');
    const actionBtn = document.getElementById('confirmModalAction');
    const cancelBtn = document.getElementById('confirmModalCancel');
    const closeBtn = document.getElementById('confirmModalClose');

    titleEl.innerHTML = title;
    bodyEl.innerHTML = message;
    actionBtn.textContent = confirmText;
    actionBtn.className = `btn ${confirmClass}`;

    const closeModal = () => modalEl.classList.remove('active');

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    actionBtn.onclick = () => {
      closeModal();
      if (typeof onConfirm === 'function') onConfirm();
    };

    modalEl.classList.add('active');
  },

  // Open & Close Custom Modals by ID
  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  },

  // Format Date for Display
  formatDate(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Format Relative Time (e.g. "5 mins ago")
  timeAgo(isoString) {
    if (!isoString) return '--';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  },

  // Status Badge Generator
  renderStatusBadge(status) {
    switch (status) {
      case 'New':
        return `<span class="badge badge-new"><i class="fa-solid fa-circle-exclamation"></i> New Alert</span>`;
      case 'Alert Acknowledged':
      case 'Acknowledged':
        return `<span class="badge badge-acknowledged"><i class="fa-solid fa-clock"></i> Acknowledged</span>`;
      case 'Assistance Required':
        return `<span class="badge badge-assistance"><i class="fa-solid fa-truck-medical"></i> Dispatching</span>`;
      case 'Resolved':
        return `<span class="badge badge-resolved"><i class="fa-solid fa-circle-check"></i> Resolved</span>`;
      default:
        return `<span class="badge badge-neutral">${status || 'Unknown'}</span>`;
    }
  },

  // Severity Badge Generator
  renderSeverityBadge(severity) {
    switch (severity) {
      case 'Critical':
        return `<span class="badge badge-critical"><i class="fa-solid fa-radiation"></i> Critical</span>`;
      case 'High':
      case 'Medium':
        return `<span class="badge badge-warning"><i class="fa-solid fa-triangle-exclamation"></i> Moderate</span>`;
      case 'Low':
        return `<span class="badge badge-info"><i class="fa-solid fa-shield"></i> Low</span>`;
      default:
        return `<span class="badge badge-neutral">${severity || 'Normal'}</span>`;
    }
  },

  // Setup Mobile Nav Toggle
  setupMobileNav() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    let backdrop = document.querySelector('.sidebar-backdrop');

    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }

    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
      });

      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
      });
    }
  },

  // Highlight Current Navigation Link
  highlightActiveNav() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'dashboard.html';
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href === page || (page === '' && href === 'dashboard.html'))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
};

window.UI = UI;
document.addEventListener('DOMContentLoaded', () => {
  UI.setupMobileNav();
  UI.highlightActiveNav();
});
