import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST().setToken(config.token);

try {
  console.log(`Registering ${commands.length} slash commands...`);

  if (config.guildId) {
    try {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
        body: commands,
      });
      console.log('✅ Guild commands registered.');
    } catch (guildErr) {
      console.warn(`Guild deploy failed (${guildErr.message}). Falling back to global...`);
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log('✅ Global commands registered.');
    }
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log('✅ Global commands registered.');
  }
} catch (err) {
  console.error(err);
}
