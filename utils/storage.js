import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_PATH || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

let cache = null;
let syncTimer = null;
let syncing = false;

const defaultDb = () => ({
  keys: {},
  users: {},
});

function githubHeaders() {
  return {
    Authorization: `Bearer ${config.githubToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

function readLocalDb() {
  try {
    if (!fs.existsSync(DB_PATH)) return null;
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeLocalDb(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function mergeDbs(a, b) {
  const left = a ?? defaultDb();
  const right = b ?? defaultDb();
  return {
    keys: { ...left.keys, ...right.keys },
    users: { ...left.users, ...right.users },
  };
}

async function fetchGithubDb() {
  if (!config.githubToken || !config.githubGistId) return null;

  try {
    const res = await fetch(`https://api.github.com/gists/${config.githubGistId}`, {
      headers: githubHeaders(),
    });
    if (!res.ok) {
      console.warn(`GitHub load failed (${res.status}): ${await res.text()}`);
      return null;
    }

    const gist = await res.json();
    const file = gist.files?.['db.json'];
    if (!file?.content) return null;
    return JSON.parse(file.content);
  } catch (err) {
    console.warn('GitHub load error:', err.message);
    return null;
  }
}

async function pushGithubDb(db) {
  if (!config.githubToken || !config.githubGistId || syncing) return;

  syncing = true;
  try {
    const res = await fetch(`https://api.github.com/gists/${config.githubGistId}`, {
      method: 'PATCH',
      headers: githubHeaders(),
      body: JSON.stringify({
        files: {
          'db.json': {
            content: JSON.stringify(db, null, 2),
          },
        },
      }),
    });

    if (!res.ok) {
      console.warn(`GitHub save failed (${res.status}): ${await res.text()}`);
      return;
    }

    console.log('☁️ Keys saved to GitHub');
  } catch (err) {
    console.warn('GitHub save error:', err.message);
  } finally {
    syncing = false;
  }
}

function scheduleGithubSync(db) {
  if (!config.githubToken || !config.githubGistId) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => pushGithubDb(db), 1500);
}

export async function refreshStorageFromGithub() {
  const remote = await fetchGithubDb();
  if (remote) {
    cache = mergeDbs(readLocalDb(), remote);
    writeLocalDb(cache);
  }
  return cache ?? readDb();
}

export async function initStorage() {
  const local = readLocalDb();
  const remote = await fetchGithubDb();
  cache = mergeDbs(local, remote);
  writeLocalDb(cache);

  if (remote) {
    console.log(`☁️ Loaded database from GitHub (${Object.keys(cache.keys).length} keys)`);
  } else if (config.githubToken && config.githubGistId) {
    console.log('☁️ No GitHub database yet — will create on first save');
    scheduleGithubSync(cache);
  }

  return cache;
}

export function readDb() {
  if (cache) return cache;
  return readLocalDb() ?? defaultDb();
}

export function writeDb(db) {
  cache = db;
  writeLocalDb(db);
  scheduleGithubSync(db);
}

export async function createGithubGist() {
  if (!config.githubToken) {
    throw new Error('GITHUB_TOKEN is required');
  }

  const db = readDb();
  const res = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: githubHeaders(),
    body: JSON.stringify({
      description: 'Sains Reborn Bot — keys & users database',
      public: false,
      files: {
        'db.json': {
          content: JSON.stringify(db, null, 2),
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create gist: ${await res.text()}`);
  }

  const gist = await res.json();
  return gist.id;
}
