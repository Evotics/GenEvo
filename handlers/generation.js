import { AttachmentBuilder } from 'discord.js';
import { config } from '../config.js';
import { canUserGen, deductCredit, getUser } from '../utils/database.js';
import { generateSecureBarcodeImage, formatPriceLabel } from '../utils/barcode.js';
import { sendLog } from '../utils/embeds.js';

export async function handleGeneration(interaction, rawEan, pricePence) {
  const access = canUserGen(interaction.user.id);
  if (!access.ok) {
    const payload = { content: `❌ ${access.error}`, ephemeral: true };
    if (interaction.deferred) return interaction.editReply(payload);
    return interaction.reply(payload);
  }

  try {
    const pngBuffer = await generateSecureBarcodeImage(rawEan, pricePence, interaction.user.id);
    const deducted = deductCredit(interaction.user.id, config.creditCostPerGen);
    if (!deducted) {
      return interaction.editReply({ content: '❌ Failed to deduct credit.', ephemeral: true });
    }

    const user = getUser(interaction.user.id);
    const attachment = new AttachmentBuilder(pngBuffer, { name: 'sainsburys-barcode.png' });
    const priceLabel = formatPriceLabel(pricePence);

    await interaction.editReply({
      content: `✅ Barcode generated — **${priceLabel}**\n💳 Credits remaining: **${user?.credits ?? 0}**`,
      files: [attachment],
    });

    await sendLog(interaction.client, '📊 Barcode Generated', [
      { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Price', value: priceLabel, inline: true },
      { name: 'Credits Left', value: `${user?.credits ?? 0}`, inline: true },
      { name: 'EAN', value: `\`${rawEan.replace(/\d(?=\d{4})/g, '*')}\``, inline: false },
    ], 0xf47738);
  } catch (err) {
    console.error('Generation error:', err);
    const msg = { content: '❌ Failed to generate barcode. Try again.', ephemeral: true };
    if (interaction.deferred) return interaction.editReply(msg);
    return interaction.reply(msg);
  }
}
