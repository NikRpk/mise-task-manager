/**
 * Debug script to check task ownership and project membership
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../temp-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'dach-ai-mvps',
});

const db = getFirestore('task-and-note-manager');

async function checkTasks() {
  console.log('\n📋 Checking all tasks:\n');
  const tasksSnapshot = await db.collection('tasks').get();
  
  console.log(`Found ${tasksSnapshot.size} tasks total\n`);
  
  const tasksByProject = {};
  
  tasksSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const projectId = data.projectId || 'NO_PROJECT';
    
    if (!tasksByProject[projectId]) {
      tasksByProject[projectId] = [];
    }
    
    tasksByProject[projectId].push({
      id: doc.id,
      title: data.title,
      status: data.status,
      owner: data.owner,
      createdBy: data.createdBy,
    });
  });
  
  for (const [projectId, tasks] of Object.entries(tasksByProject)) {
    console.log(`\n📦 Project: ${projectId}`);
    console.log(`   Tasks: ${tasks.length}`);
    tasks.forEach(task => {
      console.log(`   - ${task.title} (status: ${task.status}, owner: ${task.owner || 'unassigned'})`);
    });
  }
}

async function checkProjects() {
  console.log('\n\n📁 Checking all projects:\n');
  const projectsSnapshot = await db.collection('projects').get();
  
  console.log(`Found ${projectsSnapshot.size} projects total\n`);
  
  projectsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    console.log(`\n📂 Project: ${data.name} (${doc.id})`);
    console.log(`   Created by: ${data.createdBy}`);
    console.log(`   Members: ${data.members?.join(', ') || 'none specified'}`);
    console.log(`   Member count: ${data.members?.length || 0}`);
  });
}

async function checkUserSettings() {
  console.log('\n\n⚙️  Checking user settings:\n');
  const settingsSnapshot = await db.collection('userSettings').get();
  
  settingsSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    console.log(`\nUser: ${doc.id}`);
    console.log(`   Selected Project: ${data.selectedProjectId || 'none'}`);
    console.log(`   Theme: ${data.theme || 'not set'}`);
  });
}

async function main() {
  console.log('🔍 Debugging Task Visibility Issues\n');
  console.log('='.repeat(60));
  
  await checkTasks();
  await checkProjects();
  await checkUserSettings();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Summary:');
  console.log('   - Tasks are filtered by projectId');
  console.log('   - User must have a project selected to see tasks');
  console.log('   - User must be a member of that project');
  
  process.exit(0);
}

main().catch(console.error);
