/**
 * Debug script to check what data exists in task-and-note-manager database
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../temp-service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'dach-ai-mvps',
});

const db = getFirestore('task-and-note-manager');

async function checkCollection(collectionName) {
  console.log(`\n📦 Checking collection: ${collectionName}`);
  try {
    const snapshot = await db.collection(collectionName).limit(5).get();
    console.log(`   📊 Found ${snapshot.size} documents (showing first 5)`);
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`   - ${doc.id}:`, {
        projectId: data.projectId,
        title: data.title,
        name: data.name,
        email: data.email,
        createdBy: data.createdBy,
        createdAt: data.createdAt
      });
    });
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Checking task-and-note-manager database\n');
  
  await checkCollection('tasks');
  await checkCollection('projects');
  await checkCollection('notes');
  await checkCollection('people');
  await checkCollection('userSettings');
  
  process.exit(0);
}

main().catch(console.error);
