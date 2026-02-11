/**
 * Migration script to move task/note data from (default) database to task-and-note-manager database
 * 
 * This script:
 * 1. Connects to both databases using service account credentials
 * 2. Lists all collections in (default) database
 * 3. Copies all documents from all collections
 * 4. Verifies the copy was successful
 * 5. Optionally deletes from default (with confirmation)
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../temp-service-account-key.json');

// Initialize Firebase Admin using service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'dach-ai-mvps',
});

// Get references to both databases
const defaultDb = getFirestore(); // (default) database
const taskNoteDb = getFirestore('task-and-note-manager'); // task-and-note-manager database

async function listAllCollections() {
  console.log('\n🔍 Discovering collections in (default) database...');
  const collections = await defaultDb.listCollections();
  const collectionNames = collections.map(col => col.id);
  console.log(`   Found ${collectionNames.length} collections:`, collectionNames.join(', '));
  return collectionNames;
}

async function migrateCollection(collectionName) {
  console.log(`\n📦 Migrating collection: ${collectionName}`);
  
  try {
    // Read all documents from default database
    const sourceSnapshot = await defaultDb.collection(collectionName).get();
    
    if (sourceSnapshot.empty) {
      console.log(`   ℹ️  No documents found in ${collectionName} (default database)`);
      return { success: true, count: 0 };
    }

    console.log(`   📊 Found ${sourceSnapshot.size} documents to migrate`);

    // Batch write to task-and-note-manager database (max 500 per batch)
    const docIds = [];
    let batchCount = 0;
    let batch = taskNoteDb.batch();
    let operationsInBatch = 0;

    for (const doc of sourceSnapshot.docs) {
      const targetDocRef = taskNoteDb.collection(collectionName).doc(doc.id);
      batch.set(targetDocRef, doc.data());
      docIds.push(doc.id);
      operationsInBatch++;

      // Firestore batch limit is 500 operations
      if (operationsInBatch >= 500) {
        await batch.commit();
        batchCount++;
        console.log(`   ✅ Batch ${batchCount} committed (${operationsInBatch} documents)`);
        batch = taskNoteDb.batch();
        operationsInBatch = 0;
      }
    }

    // Commit remaining operations
    if (operationsInBatch > 0) {
      await batch.commit();
      batchCount++;
      console.log(`   ✅ Batch ${batchCount} committed (${operationsInBatch} documents)`);
    }

    console.log(`   ✅ Successfully copied ${sourceSnapshot.size} documents to task-and-note-manager database`);

    // Verify the migration
    console.log(`   🔍 Verifying migration...`);
    const verifySnapshot = await taskNoteDb.collection(collectionName).get();
    
    if (verifySnapshot.size >= sourceSnapshot.size) {
      console.log(`   ✅ Verification successful! ${verifySnapshot.size} documents in task-and-note-manager database`);
      return { success: true, count: sourceSnapshot.size, docIds };
    } else {
      console.log(`   ⚠️  Warning: Only ${verifySnapshot.size} documents found in task-and-note-manager (expected ${sourceSnapshot.size})`);
      return { success: false, count: verifySnapshot.size, docIds };
    }
  } catch (error) {
    console.error(`   ❌ Error migrating ${collectionName}:`, error.message);
    return { success: false, count: 0, error };
  }
}

async function deleteFromDefault(collectionName, docIds) {
  console.log(`\n🗑️  Deleting ${docIds.length} documents from ${collectionName} in (default) database...`);
  
  try {
    // Delete in batches of 500
    let batchCount = 0;
    let batch = defaultDb.batch();
    let operationsInBatch = 0;

    for (const docId of docIds) {
      const docRef = defaultDb.collection(collectionName).doc(docId);
      batch.delete(docRef);
      operationsInBatch++;

      if (operationsInBatch >= 500) {
        await batch.commit();
        batchCount++;
        console.log(`   🗑️  Deletion batch ${batchCount} committed (${operationsInBatch} documents)`);
        batch = defaultDb.batch();
        operationsInBatch = 0;
      }
    }

    // Commit remaining operations
    if (operationsInBatch > 0) {
      await batch.commit();
      batchCount++;
      console.log(`   🗑️  Deletion batch ${batchCount} committed (${operationsInBatch} documents)`);
    }

    console.log(`   ✅ Successfully deleted ${docIds.length} documents from (default) database`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error deleting from ${collectionName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting migration from (default) to task-and-note-manager database\n');
  console.log('Project: dach-ai-mvps');
  
  // Discover all collections
  const collections = await listAllCollections();
  
  if (collections.length === 0) {
    console.log('\n✅ No collections found in (default) database - nothing to migrate!');
    process.exit(0);
  }

  console.log('\n📋 Collections to migrate:', collections.join(', '));
  
  const results = {};
  
  // Migrate each collection
  for (const collection of collections) {
    results[collection] = await migrateCollection(collection);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  let totalMigrated = 0;
  let allSuccessful = true;
  
  for (const [collection, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${collection}: ${result.count} documents`);
    totalMigrated += result.count;
    allSuccessful = allSuccessful && result.success;
  }
  
  console.log('='.repeat(60));
  console.log(`Total documents migrated: ${totalMigrated}`);
  
  if (allSuccessful && totalMigrated > 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  IMPORTANT: Data still exists in (default) database');
    console.log('To delete the old data from (default), run:');
    console.log('  node scripts/migrate-to-task-and-note-manager-db.js --delete-old');
  } else if (totalMigrated === 0) {
    console.log('\nℹ️  No data to migrate - (default) database is empty');
  } else {
    console.log('\n⚠️  Migration completed with some errors. Please review the logs above.');
  }
  
  // Handle deletion if --delete-old flag is present
  if (process.argv.includes('--delete-old') && allSuccessful && totalMigrated > 0) {
    console.log('\n⚠️  --delete-old flag detected');
    console.log('⏳ Waiting 5 seconds before deletion... (Press Ctrl+C to cancel)');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🗑️  Deleting old data from (default) database...');
    
    for (const [collection, result] of Object.entries(results)) {
      if (result.success && result.docIds && result.docIds.length > 0) {
        await deleteFromDefault(collection, result.docIds);
      }
    }
    
    console.log('\n✅ Cleanup complete!');
  }
  
  process.exit(0);
}

// Run the migration
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
