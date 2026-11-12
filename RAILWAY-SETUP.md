# Railway Deployment Guide

## Step 1 — Upload to GitHub

1. Go to [github.com/new](https://github.com/new)
2. Name the repo (e.g. `sainsburys-gen-reborn`)
3. Upload **all files from this folder** (drag & drop or git push)

## Step 2 — Create Railway Project

1. Log in at [railway.com](https://railway.com)
2. **New Project** → **Deploy from GitHub repo**
3. Select your repository

## Step 3 — Environment Variables

In Railway → your service → **Variables**, add:

| Name | Value |
|------|-------|
| `DISCORD_TOKEN` | Your Discord bot token |
| `CLIENT_ID` | `1506617771268771961` |
| `GUILD_ID` | `1501914488553607178` |
| `DATA_PATH` | `/data` |
| `GITHUB_TOKEN` | GitHub PAT with **gist** scope |
| `GITHUB_GIST_ID` | Your gist ID (from setup below) |

## Step 4 — GitHub Key Storage (important)

This keeps all generated keys saved on GitHub so restarts/redeploys don't wipe them.

### Create GitHub token

1. [github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)**
2. Check **gist** scope only
3. Copy the token

### Create the database gist

On your PC (in this folder):

```bash
npm install
```

Create a `.env` file with:
```
GITHUB_TOKEN=your_github_token_here
```

Then run:
```bash
npm run setup-github
```

It prints something like:
```
GITHUB_GIST_ID=abc123def456...
```

Add both `GITHUB_TOKEN` and `GITHUB_GIST_ID` to Railway variables.

### Migrate existing keys

If you have keys in your local `data/db.json` already, `npm run setup-github` uploads them to the new gist automatically.

## Step 5 — Optional Railway Volume

GitHub gist storage is the main persistence layer. You can also add a Railway volume at `/data` as a local backup — not required if GitHub sync is set up.

## Step 6 — Deploy

Railway deploys on every GitHub push. Check logs for:

```
☁️ Loaded database from GitHub (500 keys)
✅ Logged in as Reborn Sains#4071
✅ Guild slash commands synced.
```

When keys change you'll see:
```
☁️ Keys saved to GitHub
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Keys lost after redeploy | Set `GITHUB_TOKEN` + `GITHUB_GIST_ID` in Railway |
| GitHub save failed | Token needs **gist** scope; check gist ID is correct |
| Bot offline | Check `DISCORD_TOKEN` |
| Invalid key | Keys must be from `/genkey` on this bot instance |

## Updating the bot

1. Edit code → push to GitHub
2. Railway redeploys
3. Bot loads keys from GitHub gist on startup — no keys lost
