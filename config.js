import dotenv from 'dotenv';

dotenv.config({ override: true });

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  ownerIds: ['925121919961923684', '1516950497188253747', '1521109466840436840'],
  adminRoleId: '1522273610964795443',

  panelChannelId: '1522273308383641650',
  vouchChannelId: '1522550480872669235',
  logChannelId: '1522549458058088509',

  accessRoleIds: ['1522550158749995018', '1522273467897086174'],

  maxMassKeys: 500,
  creditCostPerGen: 1,

  githubToken: process.env.GITHUB_TOKEN,
  githubGistId: process.env.GITHUB_GIST_ID,
};
