# Sains Reborn Discord Bot — GitHub + Railway Deploy

Upload **everything in this folder** to a new GitHub repository, then connect it to [Railway](https://railway.com).

## What's in this folder

Ready-to-upload bot source — no `node_modules`, no secrets.

## Quick start

1. Create a new repo on GitHub
2. Drag & drop **all files from this folder** into the repo
3. Go to [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub**
4. Add environment variables (see below)
5. Set up GitHub key storage (one-time, 2 minutes)
6. Deploy

## Environment variables (Railway)

| Variable | Value |
|----------|-------|
| `DISCORD_TOKEN` | Your bot token |
| `CLIENT_ID` | `1506617771268771961` |
| `GUILD_ID` | `1501914488553607178` |
| `DATA_PATH` | `/data` |
| `GITHUB_TOKEN` | GitHub token with **gist** scope |
| `GITHUB_GIST_ID` | Your gist ID (see setup below) |

## GitHub key storage (keys survive restarts)

Keys and user data are saved to a **private GitHub Gist** (`db.json`). When the bot restarts or Railway redeploys, it loads keys back automatically — users never lose access.

### One-time setup

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)**
2. Enable the **gist** scope → create token
3. On your PC, in this folder run:
   ```bash
   npm install
   # Add GITHUB_TOKEN=your_token to .env first
   npm run setup-github
   ```
4. Copy the printed `GITHUB_GIST_ID` into Railway variables along with `GITHUB_TOKEN`

Every time keys are generated, redeemed, or revoked, the bot auto-saves to GitHub within ~2 seconds.

### Migrate existing keys

If you already have keys locally in `data/db.json`, run `npm run setup-github` — it uploads your current database to a new gist.

Full Railway guide: **RAILWAY-SETUP.md**
