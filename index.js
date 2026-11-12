import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { postPanelToChannel } from './utils/embeds.js';
import { handleButton, handleModal } from './handlers/interactions.js';
import { initStorage } from './utils/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

async function registerCommands(client) {
  const commandsData = [...client.commands.values()].map((cmd) => cmd.data.toJSON());
  try {
    if (config.guildId) {
      const guild = client.guilds.cache.get(config.guildId);
      if (guild) {
        await guild.commands.set(commandsData);
        console.log('✅ Guild slash commands synced.');
        return;
      }
    }
    await client.application.commands.set(commandsData);
    console.log('✅ Global slash commands synced.');
  } catch (err) {
    console.error('Command sync failed:', err.message);
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  await registerCommands(c);
  await postPanelToChannel(c);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    }
  } catch (err) {
    console.error('Interaction error:', err);
    const msg = { content: '❌ Something went wrong.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

if (!config.token) {
  console.error('❌ DISCORD_TOKEN is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

await initStorage();
client.login(config.token);
