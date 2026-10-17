/**
 * SMART HELMET SAFETY SYSTEM - DATABASE & DATA ACCESS LAYER
 * Manages persistent storage with LocalStorage & provides a pluggable adapter for Firebase Firestore.
 */

const STORAGE_KEYS = {
  RIDERS: 'sh_riders_v1',
  INCIDENTS: 'sh_incidents_v1',
  CONTACTS: 'sh_contacts_v1',
  HELMETS: 'sh_helmets_v1',
  LOGS: 'sh_activity_logs_v1',
  USERS: 'sh_users_v1',
  CURRENT_USER: 'sh_auth_user_v1',
  SETTINGS: 'sh_settings_v1'
};

// INITIAL SEED DATA FOR DEMO PURPOSES
const SEED_DATA = {
  riders: [
    {
      id: 'RDR-1001',
      name: 'Alex Johnson',
      phone: '+1 (555) 234-5678',
      emergencyContact: 'Sarah Johnson (Spouse)',
      emergencyPhone: '+1 (555) 876-5432',
      helmetId: 'HLM-8088',
      bloodGroup: 'O+',
      medicalNotes: 'No known allergies. Carries asthma inhaler.',
      status: 'Active',
      createdAt: '2026-03-15T09:30:00Z'
    },
    {
      id: 'RDR-1002',
      name: 'Priya Sharma',
      phone: '+91 98765 43210',
      emergencyContact: 'Rajesh Sharma (Father)',
      emergencyPhone: '+91 98765 43211',
      helmetId: 'HLM-9021',
      bloodGroup: 'B+',
      medicalNotes: 'Penicillin allergy.',
      status: 'Active',
      createdAt: '2026-04-02T14:15:00Z'
    },
    {
      id: 'RDR-1003',
      name: 'Marcus Vance',
      phone: '+44 7700 900123',
      emergencyContact: 'Elena Vance (Mother)',
      emergencyPhone: '+44 7700 900456',
      helmetId: 'HLM-7432',
      bloodGroup: 'A-',
      medicalNotes: 'None',
      status: 'Active',
      createdAt: '2026-06-10T11:00:00Z'
    }
  ],
  helmets: [
    {
      id: 'HLM-8088',
      riderId: 'RDR-1001',
      model: 'AeroShield Pro V2',
      batteryLevel: 88,
      isConnected: true,
      isWorn: true,
      lastHeartbeat: new Date().toISOString()
    },
    {
      id: 'HLM-9021',
      riderId: 'RDR-1002',
      model: 'GuardX Cyber 3',
      batteryLevel: 72,
      isConnected: false,
      isWorn: false,
      lastHeartbeat: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'HLM-7432',
      riderId: 'RDR-1003',
      model: 'Vortex Sentinel S',
      batteryLevel: 94,
      isConnected: true,
      isWorn: true,
      lastHeartbeat: new Date().toISOString()
    }
  ],
  contacts: [
    {
      id: 'CTC-01',
      name: 'Sarah Johnson',
      relationship: 'Spouse',
      phone: '+1 (555) 876-5432',
      email: 'sarah.j@example.com',
      isPrimary: true,
      notes: 'Default primary emergency contact for Alex'
    },
    {
      id: 'CTC-02',
      name: 'Rajesh Sharma',
      relationship: 'Father',
      phone: '+91 98765 43211',
      email: 'rajesh.sharma@example.com',
      isPrimary: false,
      notes: 'Contact for Priya'
    },
    {
      id: 'CTC-03',
      name: 'City Emergency Dispatch (EMS)',
      relationship: 'Medical Services',
      phone: '911',
      email: 'dispatch@metro-ems.local',
      isPrimary: false,
      notes: 'Direct municipal paramedic dispatch center'
    }
  ],
  incidents: [
    {
      id: 'INC-2026-001',
      riderId: 'RDR-1001',
      riderName: 'Alex Johnson',
      type: 'High Impact Collision',
      severity: 'Critical',
      timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
      lat: 37.7749,
      lng: -122.4194,
      locationName: 'Market St & 4th Ave, San Francisco, CA',
      status: 'Resolved',
      notes: 'Simulated high-impact rollover. Paramedics dispatched, rider stabilized.',
      isSimulated: true,
      locationSource: 'Simulated Demo Coordinates',
      sensorReading: { gForce: 6.8, speed: 42, angle: 78 }
    },
    {
      id: 'INC-2026-002',
      riderId: 'RDR-1002',
      riderName: 'Priya Sharma',
      type: 'Sudden Fall / Skid',
      severity: 'Medium',
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
      lat: 37.7833,
      lng: -122.4167,
      locationName: 'Civic Center Plaza, San Francisco, CA',
      status: 'Assistance Required',
      notes: 'Simulated lateral tilt > 65 deg with 3.2G impact.',
      isSimulated: true,
      locationSource: 'Simulated Demo Coordinates',
      sensorReading: { gForce: 3.4, speed: 28, angle: 68 }
    },
    {
      id: 'INC-2026-003',
      riderId: 'RDR-1003',
      riderName: 'Marcus Vance',
      type: 'SOS Panic Alert',
      severity: 'Critical',
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      lat: 37.7690,
      lng: -122.4467,
      locationName: 'Buena Vista Park, San Francisco, CA',
      status: 'New',
      notes: 'Manual SOS button pressed by rider.',
      isSimulated: true,
      locationSource: 'Simulated Demo Coordinates',
      sensorReading: { gForce: 1.0, speed: 0, angle: 12 }
    }
  ],
  logs: [
    {
      id: 'LOG-1',
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      type: 'EMERGENCY_SOS',
      description: 'Manual SOS Triggered for Marcus Vance [INC-2026-003]',
      icon: 'fa-triangle-exclamation',
      color: 'danger'
    },
    {
      id: 'LOG-2',
      timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
      type: 'ACCIDENT_DETECTED',
      description: 'Fall detected for Priya Sharma [INC-2026-002]',
      icon: 'fa-burst',
      color: 'warning'
    },
    {
      id: 'LOG-3',
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
      type: 'HELMET_CONNECTED',
      description: 'Helmet HLM-8088 synchronized with Alex Johnson',
      icon: 'fa-hard-hat',
      color: 'info'
    }
  ]
};

class DataService {
  constructor() {
    this.firebaseConfigured = false;
    this.initLocalStorage();
  }

  // Initialize and seed if empty
  initLocalStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.RIDERS)) {
      this.resetToSeedData();
    }
  }

  resetToSeedData() {
    localStorage.setItem(STORAGE_KEYS.RIDERS, JSON.stringify(SEED_DATA.riders));
    localStorage.setItem(STORAGE_KEYS.HELMETS, JSON.stringify(SEED_DATA.helmets));
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(SEED_DATA.contacts));
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(SEED_DATA.incidents));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(SEED_DATA.logs));
    this.logActivity('SYSTEM_RESET', 'Demo data re-seeded to initial factory state', 'fa-rotate-right', 'info');
  }

  clearAllData() {
    localStorage.setItem(STORAGE_KEYS.RIDERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.HELMETS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
    this.logActivity('SYSTEM_CLEAR', 'All application records cleared', 'fa-trash', 'warning');
  }

  // Helper getters and setters
  _get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading key ${key} from storage:`, e);
      return [];
    }
  }

  _set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      console.error(`Error saving key ${key} to storage:`, e);
      return false;
    }
  }

  // RIDERS CRUD
  getRiders() {
    return this._get(STORAGE_KEYS.RIDERS);
  }

  getRiderById(id) {
    const list = this.getRiders();
    return list.find(r => r.id === id) || null;
  }

  saveRider(riderData) {
    const riders = this.getRiders();
    if (riderData.id) {
      // Update
      const idx = riders.findIndex(r => r.id === riderData.id);
      if (idx !== -1) {
        riders[idx] = { ...riders[idx], ...riderData, updatedAt: new Date().toISOString() };
        this._set(STORAGE_KEYS.RIDERS, riders);
        this.logActivity('RIDER_UPDATED', `Updated rider profile: ${riderData.name}`, 'fa-user-pen', 'info');
        return riders[idx];
      }
    }
    // Create new
    const newRider = {
      id: 'RDR-' + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toISOString(),
      status: 'Active',
      ...riderData
    };
    riders.unshift(newRider);
    this._set(STORAGE_KEYS.RIDERS, riders);
    this.logActivity('RIDER_ADDED', `Registered new rider: ${newRider.name}`, 'fa-user-plus', 'success');
    return newRider;
  }

  deleteRider(id) {
    const riders = this.getRiders();
    const rider = riders.find(r => r.id === id);
    const updated = riders.filter(r => r.id !== id);
    this._set(STORAGE_KEYS.RIDERS, updated);
    if (rider) {
      this.logActivity('RIDER_DELETED', `Deleted rider: ${rider.name} (${id})`, 'fa-user-xmark', 'danger');
    }
    return true;
  }

  // INCIDENTS CRUD
  getIncidents() {
    const list = this._get(STORAGE_KEYS.INCIDENTS);
    // Sort descending by timestamp
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getIncidentById(id) {
    const list = this.getIncidents();
    return list.find(i => i.id === id) || null;
  }

  saveIncident(incidentData) {
    const incidents = this.getIncidents();
    const newIncident = {
      id: incidentData.id || ('INC-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900)),
      timestamp: incidentData.timestamp || new Date().toISOString(),
      status: incidentData.status || 'New',
      isSimulated: true,
      ...incidentData
    };

    incidents.unshift(newIncident);
    this._set(STORAGE_KEYS.INCIDENTS, incidents);

    this.logActivity(
      'INCIDENT_CREATED',
      `Alert created: ${newIncident.type} for ${newIncident.riderName} [${newIncident.id}]`,
      'fa-triangle-exclamation',
      'danger'
    );
    return newIncident;
  }

  updateIncidentStatus(id, newStatus, resolutionNotes = '') {
    const incidents = this.getIncidents();
    const idx = incidents.findIndex(i => i.id === id);
    if (idx !== -1) {
      incidents[idx].status = newStatus;
      if (resolutionNotes) {
        incidents[idx].notes = (incidents[idx].notes ? incidents[idx].notes + ' | ' : '') + resolutionNotes;
      }
      incidents[idx].updatedAt = new Date().toISOString();
      this._set(STORAGE_KEYS.INCIDENTS, incidents);

      this.logActivity(
        'INCIDENT_STATUS',
        `Incident ${id} updated to status "${newStatus}"`,
        'fa-clipboard-check',
        newStatus === 'Resolved' ? 'success' : 'info'
      );
      return incidents[idx];
    }
    return null;
  }

  deleteIncident(id) {
    const incidents = this.getIncidents();
    const updated = incidents.filter(i => i.id !== id);
    this._set(STORAGE_KEYS.INCIDENTS, updated);
    this.logActivity('INCIDENT_DELETED', `Deleted incident record: ${id}`, 'fa-trash', 'warning');
    return true;
  }

  // EMERGENCY CONTACTS CRUD
  getContacts() {
    return this._get(STORAGE_KEYS.CONTACTS);
  }

  saveContact(contactData) {
    const contacts = this.getContacts();
    if (contactData.isPrimary) {
      // Unmark any existing primary
      contacts.forEach(c => c.isPrimary = false);
    }

    if (contactData.id) {
      const idx = contacts.findIndex(c => c.id === contactData.id);
      if (idx !== -1) {
        contacts[idx] = { ...contacts[idx], ...contactData, updatedAt: new Date().toISOString() };
        this._set(STORAGE_KEYS.CONTACTS, contacts);
        this.logActivity('CONTACT_UPDATED', `Updated contact: ${contactData.name}`, 'fa-address-book', 'info');
        return contacts[idx];
      }
    }

    const newContact = {
      id: 'CTC-' + Math.floor(10 + Math.random() * 90),
      createdAt: new Date().toISOString(),
      ...contactData
    };
    contacts.unshift(newContact);
    this._set(STORAGE_KEYS.CONTACTS, contacts);
    this.logActivity('CONTACT_ADDED', `Added contact: ${newContact.name}`, 'fa-user-plus', 'success');
    return newContact;
  }

  deleteContact(id) {
    const contacts = this.getContacts();
    const contact = contacts.find(c => c.id === id);
    const updated = contacts.filter(c => c.id !== id);
    this._set(STORAGE_KEYS.CONTACTS, updated);
    if (contact) {
      this.logActivity('CONTACT_DELETED', `Removed emergency contact: ${contact.name}`, 'fa-user-minus', 'warning');
    }
    return true;
  }

  setPrimaryContact(id) {
    const contacts = this.getContacts();
    contacts.forEach(c => {
      c.isPrimary = (c.id === id);
    });
    this._set(STORAGE_KEYS.CONTACTS, contacts);
    const primary = contacts.find(c => c.id === id);
    if (primary) {
      this.logActivity('PRIMARY_CONTACT', `${primary.name} designated as Primary Contact`, 'fa-star', 'info');
    }
    return true;
  }

  // HELMET SIMULATION STATE
  getHelmets() {
    return this._get(STORAGE_KEYS.HELMETS);
  }

  updateHelmetStatus(id, statusObj) {
    const helmets = this.getHelmets();
    const idx = helmets.findIndex(h => h.id === id);
    if (idx !== -1) {
      helmets[idx] = { ...helmets[idx], ...statusObj, lastHeartbeat: new Date().toISOString() };
      this._set(STORAGE_KEYS.HELMETS, helmets);
      return helmets[idx];
    }
    return null;
  }

  // AUDIT LOGS
  getActivityLogs() {
    return this._get(STORAGE_KEYS.LOGS).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  logActivity(type, description, icon = 'fa-info-circle', color = 'info') {
    const logs = this._get(STORAGE_KEYS.LOGS);
    const newLog = {
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toISOString(),
      type,
      description,
      icon,
      color
    };
    logs.unshift(newLog);
    // Keep last 100 logs
    if (logs.length > 100) logs.pop();
    this._set(STORAGE_KEYS.LOGS, logs);
    return newLog;
  }

  // DASHBOARD STATS AGGREGATION
  getDashboardStats() {
    const riders = this.getRiders();
    const incidents = this.getIncidents();
    const helmets = this.getHelmets();

    const totalRiders = riders.length;
    const totalIncidents = incidents.length;
    const activeAlerts = incidents.filter(i => i.status === 'New' || i.status === 'Assistance Required').length;
    const resolvedIncidents = incidents.filter(i => i.status === 'Resolved').length;
    const connectedHelmets = helmets.filter(h => h.isConnected).length;

    return {
      totalRiders,
      totalIncidents,
      activeAlerts,
      resolvedIncidents,
      connectedHelmets,
      totalHelmets: helmets.length
    };
  }
}

// Global DB instance
const DB = new DataService();
window.DB = DB;
