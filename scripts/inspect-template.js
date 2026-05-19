#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const FIRESTORE_DATABASE_ID = 'task-and-note-manager';

const sa = {
  projectId:
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(sa) });
const db = getFirestore(app, FIRESTORE_DATABASE_ID);

(async () => {
  const userId = process.argv[2] || '1wKGxbVDpkdmm34M1JcLnmXudQc2';
  const doc = await db.collection('userSettings').doc(userId).get();
  if (!doc.exists) {
    console.log('No userSettings doc for', userId);
    return;
  }
  const tpl = doc.data()?.slackTemplates?.dailyReminder;
  console.log('Has custom dailyReminder template:', !!tpl);
  if (tpl) {
    console.log('\n--- custom template ---');
    console.log(tpl);
    console.log('--- end ---\n');
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
