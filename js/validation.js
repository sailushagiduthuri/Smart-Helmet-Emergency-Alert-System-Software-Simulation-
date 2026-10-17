/**
 * SMART HELMET SAFETY SYSTEM - FORM & DATA VALIDATION
 */

const Validator = {
  // Validate Email
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  },

  // Validate Password (min 6 chars for demo)
  isValidPassword(password) {
    return typeof password === 'string' && password.trim().length >= 6;
  },

  // Validate Phone Number (supports international formats)
  isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    return cleaned.length >= 7 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
  },

  // Validate Coordinates
  isValidCoordinate(lat, lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    return !isNaN(latNum) && !isNaN(lngNum) &&
           latNum >= -90 && latNum <= 90 &&
           lngNum >= -180 && lngNum <= 180;
  },

  // Validate Non-empty string
  isNotEmpty(val) {
    return val !== null && val !== undefined && val.toString().trim().length > 0;
  },

  // Sanitize text for HTML injection prevention
  sanitize(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Validate Rider Form
  validateRider(data) {
    const errors = {};
    if (!this.isNotEmpty(data.name)) {
      errors.name = 'Rider name is required';
    }
    if (!this.isValidPhone(data.phone)) {
      errors.phone = 'Valid phone number is required';
    }
    if (!this.isNotEmpty(data.emergencyContact)) {
      errors.emergencyContact = 'Emergency contact name is required';
    }
    if (!this.isValidPhone(data.emergencyPhone)) {
      errors.emergencyPhone = 'Valid emergency contact phone is required';
    }
    if (!this.isNotEmpty(data.helmetId)) {
      errors.helmetId = 'Helmet ID is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Validate Contact Form
  validateContact(data) {
    const errors = {};
    if (!this.isNotEmpty(data.name)) {
      errors.name = 'Contact name is required';
    }
    if (!this.isValidPhone(data.phone)) {
      errors.phone = 'Valid phone number is required';
    }
    if (data.email && !this.isValidEmail(data.email)) {
      errors.email = 'Please provide a valid email or leave blank';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

window.Validator = Validator;
