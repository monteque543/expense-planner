#!/usr/bin/env node
const { exec } = require('child_process');

console.log('Pushing database schema...');
exec('npx drizzle-kit push:pg', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.log('Database schema successfully pushed!');
});