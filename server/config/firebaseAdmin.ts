import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { loadFirebaseConfig } from './env.ts';

let initialized = false;

export function getFirebaseAdminAuth() {
  if (!initialized) {
    const config = loadFirebaseConfig();
    if (!config.projectId || config.projectId === 'remixed-project-id') {
      throw new Error('Firebase project is not provisioned yet.');
    }
    if (!getApps().length) {
      initializeApp({ projectId: config.projectId });
    }
    initialized = true;
  }
  return getAuth(getApp());
}
