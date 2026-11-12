import { SlashCommandBuilder } from 'discord.js';
import { isAdmin } from '../utils/embeds.js';
import { buildPanelEmbed, buildPanelComponents } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('panel')
  .setDescription('Send the Sains Reborn generator panel');

export async function execute(interaction) {
  if (!isAdmin(interaction)) {
    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }
  await interaction.reply({
    embeds: [buildPanelEmbed()],
    components: buildPanelComponents(),
  });
}
