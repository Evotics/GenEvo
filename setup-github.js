import dotenv from 'dotenv';
import { config } from './config.js';
import { createGithubGist } from './utils/storage.js';

dotenv.config({ override: true });

if (!config.githubToken) {
  console.error('❌ Set GITHUB_TOKEN in .env first (needs "gist" scope).');
  process.exit(1);
}

try {
  const gistId = await createGithubGist();
  console.log('\n✅ GitHub gist created!\n');
  console.log(`Add this to Railway / .env:\n`);
  console.log(`GITHUB_GIST_ID=${gistId}\n`);
} catch (err) {
  console.error('❌', err.message);
  process.exit(1);
}
