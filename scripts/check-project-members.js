/**
 * Check project members structure
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../temp-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'dach-ai-mvps',
});

const db = getFirestore('task-and-note-manager');

async function checkProject() {
  const projectId = 'pHZPRGzLD8UZbigAR5pA';
  const projectDoc = await db.collection('projects').doc(projectId).get();
  
  if (!projectDoc.exists) {
    console.log('Project not found!');
    return;
  }
  
  const data = projectDoc.data();
  console.log('\n📂 Project: Personal');
  console.log('   ID:', projectId);
  console.log('   Created by:', data.createdBy);
  console.log('   Members:', JSON.stringify(data.members, null, 2));
  console.log('   Members type:', typeof data.members);
  console.log('   Members is array:', Array.isArray(data.members));
  if (Array.isArray(data.members)) {
    console.log('   Members length:', data.members.length);
    data.members.forEach((m, i) => {
      console.log(`   Member ${i}:`, typeof m, JSON.stringify(m));
    });
  }
  
  process.exit(0);
}

checkProject().catch(console.error);
