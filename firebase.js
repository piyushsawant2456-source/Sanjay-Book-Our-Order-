
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// Firebase Console मधून Web App Config नंतर इथे टाकू.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const firebaseReady =
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID" &&
  firebaseConfig.appId !== "YOUR_APP_ID";

let auth = null;
let db = null;

if (firebaseReady) {
  const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };
