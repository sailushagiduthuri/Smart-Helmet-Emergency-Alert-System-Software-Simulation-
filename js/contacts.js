/**
 * SMART HELMET SAFETY SYSTEM - EMERGENCY CONTACTS CONTROLLER
 * CRUD operations, primary designation, click-to-call, and pre-filled emergency SMS generator.
 */

const ContactsController = {
  activeEditId: null,

  init() {
    Auth.requireAuth();
    this.renderContacts();
    this.bindEvents();
  },

  renderContacts() {
    const container = document.getElementById('contactsGrid');
    if (!container) return;

    const contacts = DB.getContacts();

    if (contacts.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon"><i class="fa-solid fa-address-book"></i></div>
          <div class="empty-state-title">No Emergency Contacts Registered</div>
          <div class="empty-state-text">Add trusted contacts who should receive immediate distress alerts during simulated accidents or manual SOS dispatches.</div>
          <button class="btn btn-primary" onclick="ContactsController.openAddModal()">
            <i class="fa-solid fa-user-plus"></i> Add First Contact
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = contacts.map(c => {
      const sanitizedPhone = c.phone.replace(/[^0-9+]/g, '');
      const defaultSmsMsg = encodeURIComponent(
        `EMERGENCY ALERT: Smart Helmet System has detected a simulated accident for rider. Location coordinates attached. Please check immediately!`
      );
      const smsLink = `sms:${sanitizedPhone}?body=${defaultSmsMsg}`;
      const telLink = `tel:${sanitizedPhone}`;

      return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-color: ${c.isPrimary ? 'var(--accent-cyan)' : 'var(--border-color)'};">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <div class="stat-icon ${c.isPrimary ? 'blue' : 'amber'}" style="width: 42px; height: 42px; font-size: 1.1rem;">
                  <i class="fa-solid ${c.isPrimary ? 'fa-star' : 'fa-user-shield'}"></i>
                </div>
                <div>
                  <h3 style="font-size: 1.05rem; font-weight: 700; color: #ffffff;">${Validator.sanitize(c.name)}</h3>
                  <div style="font-size: 0.78rem; color: var(--accent-cyan); font-weight: 500;">${Validator.sanitize(c.relationship || 'Emergency Contact')}</div>
                </div>
              </div>
              ${c.isPrimary ? '<span class="badge badge-resolved"><i class="fa-solid fa-star"></i> Primary</span>' : ''}
            </div>

            <div style="margin: 1rem 0; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.88rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary);">
                <i class="fa-solid fa-phone" style="width: 16px; color: var(--accent-cyan);"></i>
                <strong>${Validator.sanitize(c.phone)}</strong>
              </div>
              ${c.email ? `
                <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary);">
                  <i class="fa-solid fa-envelope" style="width: 16px; color: var(--text-muted);"></i>
                  <span>${Validator.sanitize(c.email)}</span>
                </div>
              ` : ''}
              ${c.notes ? `
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.35rem; line-height: 1.4; border-top: 1px dashed var(--border-color); padding-top: 0.5rem;">
                  <i class="fa-solid fa-note-sticky"></i> ${Validator.sanitize(c.notes)}
                </div>
              ` : ''}
            </div>
          </div>

          <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.75rem;">
            <!-- Action buttons: Click to Call & Pre-filled SMS -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem;">
              <a href="${telLink}" class="btn btn-outline btn-sm" style="color: #34d399; border-color: rgba(16, 185, 129, 0.3);">
                <i class="fa-solid fa-phone"></i> Call Contact
              </a>
              <button class="btn btn-outline btn-sm" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);" onclick="ContactsController.openSmsModal('${c.id}', '${c.name}', '${c.phone}')">
                <i class="fa-solid fa-comment-sms"></i> Draft SMS
              </button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                ${!c.isPrimary ? `
                  <button class="btn btn-outline btn-sm" style="font-size: 0.75rem;" onclick="ContactsController.setPrimary('${c.id}')">
                    <i class="fa-regular fa-star"></i> Set Primary
                  </button>
                ` : '<span style="font-size: 0.75rem; color: var(--success);"><i class="fa-solid fa-circle-check"></i> Default Contact</span>'}
              </div>
              <div style="display: flex; gap: 0.4rem;">
                <button class="btn btn-outline btn-sm" onclick="ContactsController.openEditModal('${c.id}')" title="Edit Contact">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-outline btn-sm" style="color: #f87171;" onclick="ContactsController.confirmDelete('${c.id}')" title="Delete Contact">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  bindEvents() {
    const addBtn = document.getElementById('openAddContactModalBtn');
    const saveBtn = document.getElementById('saveContactBtn');

    if (addBtn) addBtn.addEventListener('click', () => this.openAddModal());
    if (saveBtn) saveBtn.addEventListener('click', () => this.handleSaveContact());
  },

  openAddModal() {
    this.activeEditId = null;
    document.getElementById('contactModalTitle').innerHTML = '<i class="fa-solid fa-user-plus"></i> Add Emergency Contact';
    document.getElementById('contactForm').reset();
    document.getElementById('editContactIdInput').value = '';
    this.clearErrors();
    UI.openModal('contactFormModal');
  },

  openEditModal(id) {
    const contact = DB.getContacts().find(c => c.id === id);
    if (!contact) return;

    this.activeEditId = id;
    document.getElementById('contactModalTitle').innerHTML = '<i class="fa-solid fa-user-pen"></i> Edit Contact';
    document.getElementById('editContactIdInput').value = contact.id;
    document.getElementById('contactNameInput').value = contact.name || '';
    document.getElementById('contactRelationInput').value = contact.relationship || '';
    document.getElementById('contactPhoneInput').value = contact.phone || '';
    document.getElementById('contactEmailInput').value = contact.email || '';
    document.getElementById('contactNotesInput').value = contact.notes || '';
    document.getElementById('contactIsPrimaryInput').checked = !!contact.isPrimary;

    this.clearErrors();
    UI.openModal('contactFormModal');
  },

  handleSaveContact() {
    const data = {
      id: document.getElementById('editContactIdInput').value || null,
      name: document.getElementById('contactNameInput').value.trim(),
      relationship: document.getElementById('contactRelationInput').value.trim(),
      phone: document.getElementById('contactPhoneInput').value.trim(),
      email: document.getElementById('contactEmailInput').value.trim(),
      notes: document.getElementById('contactNotesInput').value.trim(),
      isPrimary: document.getElementById('contactIsPrimaryInput').checked
    };

    const validation = Validator.validateContact(data);
    if (!validation.isValid) {
      this.displayErrors(validation.errors);
      return;
    }

    const saved = DB.saveContact(data);
    UI.closeModal('contactFormModal');
    this.renderContacts();
    UI.showToast(`Emergency contact ${saved.name} saved.`, 'success');
  },

  setPrimary(id) {
    DB.setPrimaryContact(id);
    this.renderContacts();
    UI.showToast('Primary emergency contact designated.', 'success');
  },

  confirmDelete(id) {
    const c = DB.getContacts().find(item => item.id === id);
    if (!c) return;

    UI.confirm({
      title: '<i class="fa-solid fa-user-xmark" style="color:var(--danger);"></i> Remove Contact?',
      message: `Are you sure you want to remove <strong>${Validator.sanitize(c.name)}</strong> from emergency contacts?`,
      confirmText: 'Remove Contact',
      confirmClass: 'btn-danger',
      onConfirm: () => {
        DB.deleteContact(id);
        this.renderContacts();
        UI.showToast(`Contact ${c.name} removed.`, 'warning');
      }
    });
  },

  // Modal to inspect prefilled emergency SMS before launching device SMS client
  openSmsModal(id, name, phone) {
    let modalEl = document.getElementById('smsDisclaimerModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'smsDisclaimerModal';
      modalEl.className = 'modal-overlay';
      document.body.appendChild(modalEl);
    }

    const cleanedPhone = phone.replace(/[^0-9+]/g, '');
    const messageText = `EMERGENCY SOS ALERT [Smart Helmet Safety System]: Potential motorcycle impact detected for rider at location coordinates. Immediate medical/emergency response requested. Please check and acknowledge.`;

    modalEl.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fa-solid fa-comment-sms" style="color:var(--accent-cyan);"></i> Pre-filled Emergency SMS</h3>
          <button type="button" class="modal-close-btn" onclick="UI.closeModal('smsDisclaimerModal')">&times;</button>
        </div>
        <div class="modal-body">
          <div class="sim-notice-banner" style="background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); color: #fde68a;">
            <i class="fa-solid fa-triangle-exclamation" style="color:var(--warning);"></i>
            <div>
              <strong>Dispatch Notice:</strong> Opening your device's SMS app will pre-fill this emergency text. It will NOT send automatically without your explicit manual tap in the SMS app.
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Recipient:</label>
            <input type="text" class="form-control" value="${Validator.sanitize(name)} (${Validator.sanitize(phone)})" readonly>
          </div>
          <div class="form-group">
            <label class="form-label">Pre-filled Distress Message:</label>
            <textarea class="form-control" rows="4" readonly style="font-size: 0.88rem; line-height: 1.4;">${messageText}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="UI.closeModal('smsDisclaimerModal')">Cancel</button>
          <a href="sms:${cleanedPhone}?body=${encodeURIComponent(messageText)}" class="btn btn-primary" onclick="UI.closeModal('smsDisclaimerModal'); UI.showToast('Opened messaging application.', 'info');">
            <i class="fa-solid fa-paper-plane"></i> Launch SMS App
          </a>
        </div>
      </div>
    `;

    UI.openModal('smsDisclaimerModal');
  },

  displayErrors(errors) {
    this.clearErrors();
    for (const [field, msg] of Object.entries(errors)) {
      const input = document.getElementById(`contact${field.charAt(0).toUpperCase() + field.slice(1)}Input`);
      if (input) {
        input.classList.add('is-invalid');
        const errEl = document.getElementById(`err_contact_${field}`);
        if (errEl) {
          errEl.textContent = msg;
          errEl.style.display = 'block';
        }
      }
    }
  },

  clearErrors() {
    document.querySelectorAll('#contactForm .form-control').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('#contactForm .form-error').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
  }
};

window.ContactsController = ContactsController;
document.addEventListener('DOMContentLoaded', () => {
  ContactsController.init();
});
