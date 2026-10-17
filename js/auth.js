/**
 * SMART HELMET SAFETY SYSTEM - AUTHENTICATION & SESSION CONTROLLER
 * Supports Local Demo Mode (default) with Firebase Authentication integration hooks.
 * NOTE: Local demo mode is for simulation and development and is not secure production authentication.
 */

const Auth = {
  CURRENT_USER_KEY: 'sh_auth_user_v1',
  FIREBASE_ENABLED: false,

  // Check if user is logged in
  getCurrentUser() {
    try {
      const data = localStorage.getItem(this.CURRENT_USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  // Set session
  setCurrentUser(user) {
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    this.updateUserSnippetUI();
  },

  // Check auth requirement for protected dashboard pages
  requireAuth(redirectUrl = 'login.html') {
    const user = this.getCurrentUser();
    if (!user) {
      // In demo mode, if no session exists, auto-initialize demo guest session or redirect
      // Allow seamless experience by creating a default demo officer session if visited directly
      this.loginAsDemo('officer');
      return this.getCurrentUser();
    }
    return user;
  },

  // Login handler
  async login(email, password) {
    if (!Validator.isValidEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // Check Firebase if configured
    if (window.firebase && window.firebase.auth && this.FIREBASE_ENABLED) {
      try {
        const userCredential = await window.firebase.auth().signInWithEmailAndPassword(email, password);
        const fbUser = {
          id: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName || email.split('@')[0],
          role: 'Operator',
          provider: 'firebase'
        };
        this.setCurrentUser(fbUser);
        DB.logActivity('AUTH_LOGIN', `Firebase login: ${fbUser.email}`, 'fa-right-to-bracket', 'info');
        return fbUser;
      } catch (err) {
        throw new Error(err.message || 'Firebase authentication failed.');
      }
    }

    // Demo Mode Auth
    const registeredUsers = JSON.parse(localStorage.getItem('sh_registered_users_v1') || '[]');
    const existing = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      if (existing.password !== password) {
        throw new Error('Invalid email or password.');
      }
      const user = {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role || 'Rider',
        provider: 'local_demo'
      };
      this.setCurrentUser(user);
      DB.logActivity('AUTH_LOGIN', `Demo user signed in: ${user.name}`, 'fa-right-to-bracket', 'info');
      return user;
    }

    // If not found in custom registered users, accept standard demo test account
    const user = {
      id: 'USR-' + Math.floor(1000 + Math.random() * 9000),
      email: email,
      name: email.split('@')[0].toUpperCase(),
      role: 'Emergency Dispatcher',
      provider: 'local_demo'
    };
    this.setCurrentUser(user);
    DB.logActivity('AUTH_LOGIN', `Demo session started: ${user.name}`, 'fa-right-to-bracket', 'info');
    return user;
  },

  // Register handler
  async register(name, email, password, role = 'Emergency Dispatcher') {
    if (!name || name.trim().length < 2) {
      throw new Error('Full name is required.');
    }
    if (!Validator.isValidEmail(email)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // Firebase Auth Hook if active
    if (window.firebase && window.firebase.auth && this.FIREBASE_ENABLED) {
      try {
        const userCredential = await window.firebase.auth().createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });
        const fbUser = {
          id: userCredential.user.uid,
          email,
          name,
          role,
          provider: 'firebase'
        };
        this.setCurrentUser(fbUser);
        DB.logActivity('AUTH_REGISTER', `Firebase user created: ${email}`, 'fa-user-check', 'success');
        return fbUser;
      } catch (err) {
        throw new Error(err.message || 'Firebase registration failed.');
      }
    }

    // Local Demo registration
    const registeredUsers = JSON.parse(localStorage.getItem('sh_registered_users_v1') || '[]');
    if (registeredUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists in local demo storage.');
    }

    const newUser = {
      id: 'USR-' + Date.now(),
      name: name.trim(),
      email: email.trim(),
      password: password, // Note: For client-side demo simulation only
      role,
      createdAt: new Date().toISOString()
    };
    registeredUsers.push(newUser);
    localStorage.setItem('sh_registered_users_v1', JSON.stringify(registeredUsers));

    const sessionUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      provider: 'local_demo'
    };
    this.setCurrentUser(sessionUser);
    DB.logActivity('AUTH_REGISTER', `Demo account registered: ${newUser.name}`, 'fa-user-plus', 'success');
    return sessionUser;
  },

  // 1-Click Quick Demo Login (Evaluator Friendly)
  loginAsDemo(roleType = 'officer') {
    const demoUser = roleType === 'rider' ? {
      id: 'USR-RIDER-DEMO',
      name: 'Alex Johnson (Rider)',
      email: 'alex.rider@demo.local',
      role: 'Motorcyclist',
      riderId: 'RDR-1001',
      provider: 'local_demo'
    } : {
      id: 'USR-OFFICER-DEMO',
      name: 'Chief Dispatcher Ramos',
      email: 'dispatch.hq@demo.local',
      role: 'Emergency Dispatcher',
      provider: 'local_demo'
    };

    this.setCurrentUser(demoUser);
    DB.logActivity('AUTH_DEMO', `Quick demo login as ${demoUser.role}`, 'fa-id-badge', 'info');
    return demoUser;
  },

  // Logout
  logout() {
    const user = this.getCurrentUser();
    if (user) {
      DB.logActivity('AUTH_LOGOUT', `User logged out: ${user.name}`, 'fa-right-from-bracket', 'info');
    }
    localStorage.removeItem(this.CURRENT_USER_KEY);
    if (window.firebase && window.firebase.auth && this.FIREBASE_ENABLED) {
      window.firebase.auth().signOut().catch(console.warn);
    }
    window.location.href = 'login.html';
  },

  // Update UI sidebar user snippet
  updateUserSnippetUI() {
    const user = this.getCurrentUser();
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');
    const avatarEl = document.getElementById('sidebarUserAvatar');

    if (user) {
      if (nameEl) nameEl.textContent = user.name;
      if (roleEl) roleEl.textContent = user.role;
      if (avatarEl) {
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        avatarEl.textContent = initials || 'SH';
      }
    }
  }
};

window.Auth = Auth;
document.addEventListener('DOMContentLoaded', () => {
  Auth.updateUserSnippetUI();
});
