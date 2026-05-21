#!/usr/bin/env node
/**
 * One-off migration: rewrite `owner` on every task that currently has the
 * value `fromOwner` to `toOwner`.
 *
 * Usage:
 *   node scripts/migrate-owner.js                      # dry-run (no writes)
 *   node scripts/migrate-owner.js --apply              # actually writes
 *   node scripts/migrate-owner.js \
 *     --from "Old Name" --to "new@email" --apply      # custom values
 *
 * Defaults can be set via MIGRATE_OWNER_FROM and MIGRATE_OWNER_TO environment
 * variables in .env.local, or passed directly with --from / --to flags.
 * The most common invocation is just `node scripts/migrate-owner.js --apply`
 * once the env vars are set.
 */
require('dotenv').config({ path: '.env.local' });

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const DEFAULT_FROM = process.env.MIGRATE_OWNER_FROM || '';
const DEFAULT_TO = process.env.MIGRATE_OWNER_TO || '';
const FIRESTORE_BATCH_LIMIT = 400;

// Production uses a NAMED Firestore database (see lib/firebase-admin.ts).
// Hitting the default DB would silently report zero matches.
const FIRESTORE_DATABASE_ID = 'task-and-note-manager';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const index = args.indexOf(flag);
    return index !== -1 ? args[index + 1] : undefined;
  };
  return {
    fromOwner: get('--from') || DEFAULT_FROM,
    toOwner: get('--to') || DEFAULT_TO,
    apply: args.includes('--apply'),
  };
}

function initDb() {
  const serviceAccount = {
    projectId:
      process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (
    !serviceAccount.projectId ||
    !serviceAccount.clientEmail ||
    !serviceAccount.privateKey
  ) {
    console.error(
      '❌ Missing Firebase Admin credentials in .env.local. Expected ' +
        'FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY.'
    );
    process.exit(1);
  }

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(serviceAccount) });

  const db = getFirestore(app, FIRESTORE_DATABASE_ID);
  return { db, projectId: serviceAccount.projectId };
}

async function run() {
  const { fromOwner, toOwner, apply } = parseArgs();
  const { db, projectId } = initDb();

  console.log('\n🔍 Task owner migration');
  console.log('   Project:   ', projectId);
  console.log('   Database:  ', FIRESTORE_DATABASE_ID);
  console.log('   From:      ', JSON.stringify(fromOwner));
  console.log('   To:        ', JSON.stringify(toOwner));
  console.log('   Mode:      ', apply ? 'APPLY (writes will happen)' : 'DRY RUN');
  console.log('');

  if (fromOwner === toOwner) {
    console.error('❌ --from and --to must be different.');
    process.exit(1);
  }

  const projectsSnapshot = await db.collection('projects').get();
  const projectNames = new Map();
  projectsSnapshot.docs.forEach((doc) => {
    projectNames.set(doc.id, doc.data().name || '(unnamed project)');
  });

  const snapshot = await db
    .collection('tasks')
    .where('owner', '==', fromOwner)
    .get();

  if (snapshot.empty) {
    console.log('✅ No tasks matched. Nothing to do.');
    return;
  }

  console.log(`Found ${snapshot.size} task(s) with owner = ${JSON.stringify(fromOwner)}:\n`);
  snapshot.docs.forEach((doc, i) => {
    const data = doc.data();
    const title = data.title || data.description || '(no title)';
    const deadline = data.deadline || '—';
    const status = data.status || '—';
    const projectName = projectNames.get(data.projectId) || '(unknown project)';
    console.log(
      `  ${String(i + 1).padStart(3, ' ')}. [${status}] ${title}  ` +
        `· project: ${projectName}  · deadline: ${deadline}  · id: ${doc.id}`
    );
  });

  if (!apply) {
    console.log('\nℹ️  Dry run — no writes performed. Re-run with --apply to commit.');
    return;
  }

  console.log('\n✍️  Applying updates…');
  let updated = 0;
  for (let i = 0; i < snapshot.docs.length; i += FIRESTORE_BATCH_LIMIT) {
    const chunk = snapshot.docs.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = db.batch();
    chunk.forEach((doc) => {
      batch.update(doc.ref, {
        owner: toOwner,
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
    updated += chunk.length;
    console.log(
      `   committed chunk ${Math.ceil((i + chunk.length) / FIRESTORE_BATCH_LIMIT)} (${updated}/${snapshot.size})`
    );
  }

  console.log(`\n✅ Done. Updated ${updated} task(s).`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
