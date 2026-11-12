import { SlashCommandBuilder } from 'discord.js';
import { createKey, parseExpiryDays } from '../utils/database.js';
import { isAdmin, sendLog } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('genkey')
  .setDescription('Generate a single access key')
  .addIntegerOption((o) =>
    o.setName('credits').setDescription('Credits the key grants').setRequired(true).setMinValue(1).setMaxValue(10000)
  )
  .addStringOption((o) =>
    o
      .setName('expires')
      .setDescription('When the key expires')
      .setRequired(true)
      .addChoices(
        { name: '1 Day', value: '1' },
        { name: '7 Days', value: '7' },
        { name: '30 Days', value: '30' },
        { name: '90 Days', value: '90' },
        { name: 'Never', value: '0' }
      )
  );

export async function execute(interaction) {
  if (!isAdmin(interaction)) {
    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }

  const credits = interaction.options.getInteger('credits');
  const days = parseInt(interaction.options.getString('expires'), 10);
  const expiresAt = parseExpiryDays(days);

  const code = createKey({
    credits,
    expiresAt,
    createdBy: interaction.user.id,
  });

  await interaction.reply({
    content: `✅ Key generated:\n\`\`\`${code}\`\`\`\n**Credits:** ${credits}\n**Expires:** ${days === 0 ? 'Never' : `${days} days`}`,
    ephemeral: true,
  });

  await sendLog(interaction.client, '🔑 Key Generated', [
    { name: 'Admin', value: `<@${interaction.user.id}>`, inline: true },
    { name: 'Credits', value: `${credits}`, inline: true },
    { name: 'Expires', value: days === 0 ? 'Never' : `${days} days`, inline: true },
    { name: 'Key', value: `\`${code}\``, inline: false },
  ], 0x57f287);
}
