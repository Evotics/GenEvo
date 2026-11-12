import { SlashCommandBuilder } from 'discord.js';
import { canUserGen } from '../utils/database.js';
import { buildPriceRow } from '../utils/embeds.js';
import { EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('gen')
  .setDescription('Generate a Sainsburys barcode')
  .addStringOption((o) =>
    o
      .setName('barcode')
      .setDescription('13-digit product EAN barcode')
      .setRequired(true)
      .setMinLength(8)
      .setMaxLength(13)
  )
  .addIntegerOption((o) =>
    o
      .setName('price')
      .setDescription('Price in pence (e.g. 100 = £1)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(99999)
  );

export async function execute(interaction) {
  const access = canUserGen(interaction.user.id);
  if (!access.ok) {
    return interaction.reply({ content: `❌ ${access.error}`, ephemeral: true });
  }

  const barcode = interaction.options.getString('barcode').replace(/\D/g, '');
  const price = interaction.options.getInteger('price');

  if (barcode.length < 8) {
    return interaction.reply({ content: '❌ Enter at least 8 barcode digits.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const { handleGeneration } = await import('../handlers/generation.js');
  await handleGeneration(interaction, barcode, price);
}

export async function showGenMenu(interaction) {
  const access = canUserGen(interaction.user.id);
  if (!access.ok) {
    return interaction.reply({ content: `❌ ${access.error}`, ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setColor(0xf47738)
    .setTitle('📊 Generate Barcode')
    .setDescription(
      'Select a price below, then enter your product barcode.\n\n' +
        `**Credits remaining:** ${access.user.credits}`
    );

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ embeds: [embed], components: [buildPriceRow('gen_price')], ephemeral: true });
  } else {
    await interaction.reply({ embeds: [embed], components: [buildPriceRow('gen_price')], ephemeral: true });
  }
}
