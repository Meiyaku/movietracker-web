// IMPORTANT: Before using this app, you must register a Web App in the Firebase Console:
// 1. Go to https://console.firebase.google.com/project/tjr-movietracker/settings/general
// 2. Scroll to "Your apps" and click the </> (Web) icon to add a web app
// 3. Copy the appId from the generated config and set VITE_FIREBASE_APP_ID in .env

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

// Persistent IndexedDB cache lets Firestore serve reads offline from the last seen
// snapshot. The multi-tab manager keeps multiple open tabs coordinated.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
