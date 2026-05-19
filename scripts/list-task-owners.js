#!/usr/bin/env node
/**
 * Diagnostic: list every unique `owner` value currently stored on tasks,
 * with count and sample titles. Read-only.
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
  const snapshot = await db.collection('tasks').get();
  const counts = new Map();
  snapshot.docs.forEach((doc) => {
    const owner = doc.data().owner;
    const key = typeof owner === 'string' ? owner : `<non-string: ${typeof owner}>`;
    if (!counts.has(key)) counts.set(key, { count: 0, sampleTitles: [] });
    const entry = counts.get(key);
    entry.count += 1;
    if (entry.sampleTitles.length < 3) {
      const data = doc.data();
      entry.sampleTitles.push(data.title || data.description || '(no title)');
    }
  });

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count);

  console.log(`\nDatabase: ${FIRESTORE_DATABASE_ID}`);
  console.log(`Total tasks scanned: ${snapshot.size}\n`);
  console.log('Owner value distribution:');
  console.log('─'.repeat(100));
  sorted.forEach(([owner, info]) => {
    const rendered = JSON.stringify(owner);
    console.log(
      `  ${String(info.count).padStart(4, ' ')}  ${rendered}  — e.g. ${info.sampleTitles
        .slice(0, 2)
        .join(' | ')}`
    );
  });
  console.log('');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
