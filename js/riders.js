/**
 * SMART HELMET SAFETY SYSTEM - RIDER PROFILE MANAGEMENT
 * CRUD controller for managing riders, helmet assignments, and emergency details.
 */

const RidersController = {
  activeEditRiderId: null,

  init() {
    Auth.requireAuth();
    this.renderRiders();
    this.bindEvents();
  },

  renderRiders() {
    const grid = document.getElementById('ridersGrid');
    const tableBody = document.getElementById('ridersTableBody');
    const searchVal = (document.getElementById('riderSearchInput')?.value || '').toLowerCase().trim();
    const bloodFilter = document.getElementById('bloodGroupFilter')?.value || '';

    let riders = DB.getRiders();

    // Filter
    if (searchVal) {
      riders = riders.filter(r => 
        (r.name && r.name.toLowerCase().includes(searchVal)) ||
        (r.phone && r.phone.toLowerCase().includes(searchVal)) ||
        (r.helmetId && r.helmetId.toLowerCase().includes(searchVal)) ||
        (r.id && r.id.toLowerCase().includes(searchVal))
      );
    }

    if (bloodFilter) {
      riders = riders.filter(r => r.bloodGroup === bloodFilter);
    }

    // Update Counter
    const countEl = document.getElementById('riderCountBadge');
    if (countEl) countEl.textContent = `${riders.length} Registered`;

    // Render Table View if table exists
    if (tableBody) {
      if (riders.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
              <i class="fa-solid fa-user-slash" style="font-size: 2.5rem; margin-bottom: 0.5rem; display: block; opacity: 0.4;"></i>
              No matching rider profiles found.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = riders.map(r => `
        <tr>
          <td>
            <strong>${Validator.sanitize(r.id)}</strong>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">${Validator.sanitize(r.name)}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-solid fa-phone" style="font-size: 0.7rem;"></i> ${Validator.sanitize(r.phone)}</div>
          </td>
          <td>
            <span class="badge badge-neutral" style="font-family: monospace;">
              <i class="fa-solid fa-helmet-safety" style="color:var(--accent-cyan);"></i> ${Validator.sanitize(r.helmetId)}
            </span>
          </td>
          <td>
            <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.25);">
              ${Validator.sanitize(r.bloodGroup || 'Unknown')}
            </span>
          </td>
          <td>
            <div style="font-weight: 500; font-size: 0.88rem;">${Validator.sanitize(r.emergencyContact)}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${Validator.sanitize(r.emergencyPhone)}</div>
          </td>
          <td>
            <span class="badge badge-resolved">${r.status || 'Active'}</span>
          </td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-outline btn-sm" onclick="RidersController.openEditModal('${r.id}')" title="Edit Rider">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-outline btn-sm" style="color:#f87171;" onclick="RidersController.confirmDelete('${r.id}')" title="Delete Rider">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  },

  bindEvents() {
    const addBtn = document.getElementById('openAddRiderModalBtn');
    const saveBtn = document.getElementById('saveRiderBtn');
    const searchInput = document.getElementById('riderSearchInput');
    const bloodFilter = document.getElementById('bloodGroupFilter');

    if (addBtn) addBtn.addEventListener('click', () => this.openAddModal());
    if (saveBtn) saveBtn.addEventListener('click', () => this.handleSaveRider());
    if (searchInput) searchInput.addEventListener('input', () => this.renderRiders());
    if (bloodFilter) bloodFilter.addEventListener('change', () => this.renderRiders());
  },

  openAddModal() {
    this.activeEditRiderId = null;
    document.getElementById('riderModalTitle').innerHTML = '<i class="fa-solid fa-user-plus"></i> Register New Rider';
    document.getElementById('riderForm').reset();
    document.getElementById('editRiderIdInput').value = '';
    
    // Auto-generate suggested Helmet ID
    document.getElementById('riderHelmetIdInput').value = 'HLM-' + Math.floor(1000 + Math.random() * 9000);
    this.clearErrors();
    UI.openModal('riderFormModal');
  },

  openEditModal(id) {
    const rider = DB.getRiderById(id);
    if (!rider) return;

    this.activeEditRiderId = id;
    document.getElementById('riderModalTitle').innerHTML = '<i class="fa-solid fa-user-pen"></i> Edit Rider Profile';
    document.getElementById('editRiderIdInput').value = rider.id;
    document.getElementById('riderNameInput').value = rider.name || '';
    document.getElementById('riderPhoneInput').value = rider.phone || '';
    document.getElementById('riderEmergencyNameInput').value = rider.emergencyContact || '';
    document.getElementById('riderEmergencyPhoneInput').value = rider.emergencyPhone || '';
    document.getElementById('riderHelmetIdInput').value = rider.helmetId || '';
    document.getElementById('riderBloodGroupInput').value = rider.bloodGroup || '';
    document.getElementById('riderMedicalNotesInput').value = rider.medicalNotes || '';

    this.clearErrors();
    UI.openModal('riderFormModal');
  },

  handleSaveRider() {
    const data = {
      id: document.getElementById('editRiderIdInput').value || null,
      name: document.getElementById('riderNameInput').value.trim(),
      phone: document.getElementById('riderPhoneInput').value.trim(),
      emergencyContact: document.getElementById('riderEmergencyNameInput').value.trim(),
      emergencyPhone: document.getElementById('riderEmergencyPhoneInput').value.trim(),
      helmetId: document.getElementById('riderHelmetIdInput').value.trim(),
      bloodGroup: document.getElementById('riderBloodGroupInput').value,
      medicalNotes: document.getElementById('riderMedicalNotesInput').value.trim()
    };

    const validation = Validator.validateRider(data);
    if (!validation.isValid) {
      this.displayErrors(validation.errors);
      return;
    }

    const saved = DB.saveRider(data);
    UI.closeModal('riderFormModal');
    this.renderRiders();
    UI.showToast(
      this.activeEditRiderId ? `Rider ${saved.name} updated successfully.` : `New rider ${saved.name} registered.`,
      'success'
    );
  },

  confirmDelete(id) {
    const rider = DB.getRiderById(id);
    if (!rider) return;

    UI.confirm({
      title: '<i class="fa-solid fa-user-xmark" style="color:var(--danger);"></i> Delete Rider?',
      message: `Are you sure you want to delete rider <strong>${Validator.sanitize(rider.name)}</strong> (${rider.id})? This will detach helmet ${rider.helmetId} and remove their profile.`,
      confirmText: 'Delete Rider',
      confirmClass: 'btn-danger',
      onConfirm: () => {
        DB.deleteRider(id);
        this.renderRiders();
        UI.showToast(`Rider ${rider.name} deleted.`, 'warning');
      }
    });
  },

  displayErrors(errors) {
    this.clearErrors();
    for (const [field, msg] of Object.entries(errors)) {
      const input = document.getElementById(`rider${field.charAt(0).toUpperCase() + field.slice(1)}Input`);
      if (input) {
        input.classList.add('is-invalid');
        const errEl = document.getElementById(`err_${field}`);
        if (errEl) {
          errEl.textContent = msg;
          errEl.style.display = 'block';
        }
      }
    }
  },

  clearErrors() {
    document.querySelectorAll('#riderForm .form-control').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('#riderForm .form-error').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
  }
};

window.RidersController = RidersController;
document.addEventListener('DOMContentLoaded', () => {
  RidersController.init();
});
