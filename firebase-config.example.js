/**
 * SMART HELMET SAFETY SYSTEM - FIREBASE CONFIGURATION TEMPLATE
 * 
 * Instructions to connect real Firebase:
 * 1. Create a project at https://console.firebase.google.com/
 * 2. Enable "Authentication" with Email/Password sign-in provider.
 * 3. Create a "Cloud Firestore" database in test or production mode.
 * 4. Register a Web App in your Firebase console.
 * 5. Copy your firebaseConfig object below into a new file named `firebase-config.js`.
 * 6. Set FIREBASE_ENABLED = true in js/auth.js.
 */

// Replace the placeholder values with your actual Firebase project settings:
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789"
};

/*
RECOMMENDED FIRESTORE SECURITY RULES (Deploy in Firebase Console > Firestore > Rules):

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can access smart helmet records
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /riders/{riderId} {
      allow read, write: if request.auth != null;
    }
    match /helmets/{helmetId} {
      allow read, write: if request.auth != null;
    }
    match /incidents/{incidentId} {
      allow read, create, update: if request.auth != null;
      allow delete: if request.auth != null && request.auth.token.role == 'admin';
    }
    match /emergency_contacts/{contactId} {
      allow read, write: if request.auth != null;
    }
    match /activity_logs/{logId} {
      allow read, create: if request.auth != null;
    }
  }
}
*/
