#!/usr/bin/env node
/**
 * Diagnostic: list `userSettings` docs (userId, email, displayName,
 * notifications.dailyTaskReminder). Read-only, used to pick the right
 * userId for the test reminder endpoint.
 */
require('dotenv').config({ path: '.env.local' });

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const FIRESTORE_DATABASE_ID = 'task-and-note-manager';

const serviceAccount = {
  projectId:
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app, FIRESTORE_DATABASE_ID);

async function run() {
  const snap = await db.collection('userSettings').get();
  console.log(`\nuserSettings: ${snap.size} doc(s)\n`);
  snap.docs.forEach((doc) => {
    const d = doc.data();
    const reminder = d?.notifications?.dailyTaskReminder;
    console.log(`  id=${doc.id}`);
    console.log(`    email:       ${d.email || '(none)'}`);
    console.log(`    displayName: ${d.displayName || '(none)'}`);
    console.log(
      `    dailyReminder.slack: ${reminder ? String(!!reminder.slack) : '(no settings)'}`
    );
    console.log('');
  });
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
