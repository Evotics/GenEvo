import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { createKey, parseExpiryDays } from '../utils/database.js';
import { isAdmin, sendLog } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('masskey')
  .setDescription('Generate multiple access keys (up to 500)')
  .addIntegerOption((o) =>
    o.setName('amount').setDescription('Number of keys (max 500)').setRequired(true).setMinValue(1).setMaxValue(500)
  )
  .addIntegerOption((o) =>
    o.setName('credits').setDescription('Credits each key grants').setRequired(true).setMinValue(1).setMaxValue(10000)
  )
  .addStringOption((o) =>
    o
      .setName('expires')
      .setDescription('When keys expire')
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

  await interaction.deferReply({ ephemeral: true });

  const amount = interaction.options.getInteger('amount');
  const credits = interaction.options.getInteger('credits');
  const days = parseInt(interaction.options.getString('expires'), 10);
  const expiresAt = parseExpiryDays(days);

  const keys = [];
  for (let i = 0; i < amount; i++) {
    keys.push(
      createKey({
        credits,
        expiresAt,
        createdBy: interaction.user.id,
      })
    );
  }

  const fileContent = keys.join('\n');
  const attachment = new AttachmentBuilder(Buffer.from(fileContent, 'utf8'), {
    name: `sains-keys-${Date.now()}.txt`,
  });

  await interaction.editReply({
    content: `✅ Generated **${amount}** keys (${credits} credits each, ${days === 0 ? 'never expires' : `expires in ${days} days`}).`,
    files: [attachment],
  });

  await sendLog(interaction.client, '🔑 Mass Keys Generated', [
    { name: 'Admin', value: `<@${interaction.user.id}>`, inline: true },
    { name: 'Amount', value: `${amount}`, inline: true },
    { name: 'Credits Each', value: `${credits}`, inline: true },
    { name: 'Expires', value: days === 0 ? 'Never' : `${days} days`, inline: true },
  ], 0x57f287);
}
