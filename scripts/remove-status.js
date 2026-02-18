#!/usr/bin/env node
require('dotenv').config({ path: '.env.local', debug: true });

const admin = require('firebase-admin');

const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function removeStatus() {
  try {
    const statusId = process.argv[2] || 'status-1770398653777';
    
    console.log(`\n🗑️  Removing status: ${statusId}\n`);

    // Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    
    if (projectsSnapshot.empty) {
      console.log('❌ No projects found.');
      return;
    }

    for (const projectDoc of projectsSnapshot.docs) {
      const projectData = projectDoc.data();
      const settings = projectData.settings || {};
      
      if (!settings.statusOptions) {
        continue;
      }

      const statusExists = settings.statusOptions.some(opt => opt.id === statusId);
      
      if (statusExists) {
        console.log(`📋 Found status in project: ${projectDoc.id}`);
        
        // Remove the status
        settings.statusOptions = settings.statusOptions.filter(opt => opt.id !== statusId);
        
        // Update the project
        await db.collection('projects').doc(projectDoc.id).update({
          'settings.statusOptions': settings.statusOptions,
        });
        
        console.log(`✅ Removed status from project: ${projectDoc.id}`);
      }
    }

    console.log(`\n🎉 Status removal complete!\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removeStatus();
