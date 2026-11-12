import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { redeemKey, getUser, getKey, formatExpiry, normalizeKeyCode } from '../utils/database.js';
import { refreshStorageFromGithub } from '../utils/storage.js';
import {
  buildBalanceEmbed,
  assignAccessRoles,
  sendVouch,
  sendLog,
} from '../utils/embeds.js';
import { showGenMenu } from '../commands/gen.js';
import { handleGeneration } from './generation.js';

const pendingPrices = new Map();

export function setPendingPrice(userId, price) {
  pendingPrices.set(userId, { price, at: Date.now() });
}

export function getPendingPrice(userId) {
  const entry = pendingPrices.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.at > 5 * 60 * 1000) {
    pendingPrices.delete(userId);
    return null;
  }
  return entry.price;
}

export async function handleButton(interaction) {
  const id = interaction.customId;

  if (id === 'panel_redeem') {
    const modal = new ModalBuilder().setCustomId('modal_redeem').setTitle('Redeem Access Key');
    const input = new TextInputBuilder()
      .setCustomId('key_code')
      .setLabel('Access Key')
      .setPlaceholder('XXXX-XXXX-XXXX-XXXX')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(24);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  if (id === 'panel_gen') {
    return showGenMenu(interaction);
  }

  if (id === 'panel_balance') {
    return interaction.reply({
      embeds: [buildBalanceEmbed(interaction.user.id)],
      ephemeral: true,
    });
  }

  if (id === 'gen_enter_barcode') {
    const price = getPendingPrice(interaction.user.id);
    if (!price) {
      return interaction.reply({
        content: '❌ Price selection expired. Please select a price again.',
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder().setCustomId('modal_barcode').setTitle('Product Barcode');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('barcode_ean')
          .setLabel('13-digit EAN barcode')
          .setPlaceholder('Enter product barcode digits')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(8)
          .setMaxLength(13)
      )
    );
    return interaction.showModal(modal);
  }

  if (id.startsWith('gen_price_')) {
    const suffix = id.replace('gen_price_', '');

    if (suffix === 'custom') {
      const modal = new ModalBuilder().setCustomId('modal_custom_price').setTitle('Custom Price');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('custom_price')
            .setLabel('Price in pence')
            .setPlaceholder('e.g. 150 for £1.50')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(5)
        )
      );
      return interaction.showModal(modal);
    }

    const price = parseInt(suffix, 10);
    setPendingPrice(interaction.user.id, price);

    const modal = new ModalBuilder().setCustomId('modal_barcode').setTitle('Product Barcode');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('barcode_ean')
          .setLabel('13-digit EAN barcode')
          .setPlaceholder('Enter product barcode digits')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(8)
          .setMaxLength(13)
      )
    );
    return interaction.showModal(modal);
  }
}

export async function handleModal(interaction) {
  const id = interaction.customId;

  if (id === 'modal_redeem') {
    await interaction.deferReply({ ephemeral: true });

    const raw = interaction.fields.getTextInputValue('key_code').trim();
    let result = redeemKey(raw, interaction.user.id);

    if (!result.ok) {
      await refreshStorageFromGithub();
      result = redeemKey(raw, interaction.user.id);
    }

    if (!result.ok) {
      const existing = getKey(raw);
      if (existing?.redeemedBy === interaction.user.id) {
        result = {
          ok: true,
          key: existing,
          user: getUser(interaction.user.id),
          code: normalizeKeyCode(raw),
          isFirstRedemption: false,
        };
      }
    }

    if (!result.ok) {
      return interaction.editReply({ content: `❌ ${result.error}` });
    }

    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await assignAccessRoles(member);
      if (result.isFirstRedemption) {
        await sendVouch(interaction.client, member);
      }
    } catch (err) {
      console.error('Role/vouch error:', err);
    }

    const user = getUser(interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('✅ Successfully Redeemed')
      .setDescription('Your key has been **successfully redeemed**! You now have access to the generator.')
      .addFields(
        { name: 'Credits', value: `${user?.credits ?? result.key.credits}`, inline: true },
        { name: 'Access Expires', value: formatExpiry(user?.accessExpiresAt), inline: true }
      );

    await interaction.editReply({
      content: '✅ **Successfully redeemed!**',
      embeds: [embed],
    });

    await sendLog(interaction.client, '🎟️ Key Redeemed', [
      { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Key', value: `\`${result.code ?? normalizeKeyCode(raw)}\``, inline: true },
      { name: 'Credits', value: `${result.key.credits}`, inline: true },
      { name: 'Expires', value: formatExpiry(result.key.expiresAt), inline: true },
    ], 0x57f287);
    return;
  }

  if (id === 'modal_custom_price') {
    const raw = interaction.fields.getTextInputValue('custom_price').replace(/\D/g, '');
    const price = parseInt(raw, 10);
    if (!price || price < 1) {
      return interaction.reply({ content: '❌ Enter a valid price in pence.', ephemeral: true });
    }

    setPendingPrice(interaction.user.id, price);

    return interaction.reply({
      content: `✅ Price set to **${price}p**. Click below to enter your barcode.`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('gen_enter_barcode')
            .setLabel('Enter Barcode')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📊')
        ),
      ],
      ephemeral: true,
    });
  }

  if (id === 'modal_barcode') {
    const ean = interaction.fields.getTextInputValue('barcode_ean').replace(/\D/g, '');
    const price = getPendingPrice(interaction.user.id);

    if (!price) {
      return interaction.reply({
        content: '❌ Price selection expired. Please select a price again.',
        ephemeral: true,
      });
    }

    if (ean.length < 8) {
      return interaction.reply({ content: '❌ Enter at least 8 barcode digits.', ephemeral: true });
    }

    pendingPrices.delete(interaction.user.id);
    await interaction.deferReply({ ephemeral: true });
    return handleGeneration(interaction, ean, price);
  }
}
