import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from 'discord.js';
import { config } from '../config.js';
import { getUser, formatExpiry } from '../utils/database.js';

export function buildPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0xf47738)
    .setTitle('🛒 Sains Reborn — Generator Panel')
    .setDescription(
      'Welcome to **Sains Reborn**. Redeem your access key or generate a barcode below.\n\n' +
        '**Redeem Key** — Activate your key to receive credits & access\n' +
        '**Generate** — Create a secure barcode (costs 1 credit)\n' +
        '**Balance** — Check your remaining credits'
    )
    .setFooter({ text: 'Sains Reborn · Private Generator' })
    .setTimestamp();
}

export function buildPanelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('panel_redeem')
        .setLabel('Redeem Key')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔑'),
      new ButtonBuilder()
        .setCustomId('panel_gen')
        .setLabel('Generate Barcode')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📊'),
      new ButtonBuilder()
        .setCustomId('panel_balance')
        .setLabel('Balance')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('💳')
    ),
  ];
}

export function buildPriceRow(prefix = 'gen_price') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${prefix}_10`).setLabel('10p').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${prefix}_49`).setLabel('49p').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${prefix}_100`).setLabel('£1').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`${prefix}_custom`).setLabel('Custom').setStyle(ButtonStyle.Primary)
  );
}

export function buildBalanceEmbed(userId) {
  const user = getUser(userId);
  const credits = user?.credits ?? 0;
  const revoked = user?.revoked ?? false;
  const expires = formatExpiry(user?.accessExpiresAt);

  return new EmbedBuilder()
    .setColor(revoked ? 0xff4444 : 0xf47738)
    .setTitle('💳 Your Balance')
    .addFields(
      { name: 'Credits', value: `${credits}`, inline: true },
      { name: 'Access Expires', value: expires, inline: true },
      { name: 'Status', value: revoked ? '❌ Revoked' : credits > 0 ? '✅ Active' : '⚠️ No credits', inline: true }
    );
}

export function buildVouchEmbed(member) {
  return new EmbedBuilder()
    .setColor(0xf47738)
    .setTitle('✅ New Vouch')
    .setDescription(`${member} has vouched from sainsburys`)
    .setThumbnail(member.displayAvatarURL({ size: 128 }))
    .setTimestamp();
}

export function buildLogEmbed(title, fields, color = 0x5865f2) {
  return new EmbedBuilder().setColor(color).setTitle(title).addFields(fields).setTimestamp();
}

export function isAdmin(interaction) {
  const userId = interaction.user.id;
  if (config.ownerIds.includes(userId)) return true;

  const member = interaction.member;
  if (member?.roles?.cache?.has(config.adminRoleId)) return true;

  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;
}

export async function sendLog(client, title, fields, color) {
  try {
    const ch = await client.channels.fetch(config.logChannelId);
    if (ch?.isTextBased()) {
      await ch.send({ embeds: [buildLogEmbed(title, fields, color)] });
    }
  } catch {
    /* ignore */
  }
}

export async function sendVouch(client, member) {
  try {
    const ch = await client.channels.fetch(config.vouchChannelId);
    if (ch?.isTextBased()) {
      await ch.send({ embeds: [buildVouchEmbed(member)] });
    }
  } catch {
    /* ignore */
  }
}

export async function assignAccessRoles(member) {
  for (const roleId of config.accessRoleIds) {
    try {
      const role = await member.guild.roles.fetch(roleId);
      if (role && !member.roles.cache.has(roleId)) {
        await member.roles.add(role);
      }
    } catch {
      /* ignore missing role */
    }
  }
}

export async function removeAccessRoles(member) {
  for (const roleId of config.accessRoleIds) {
    try {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
      }
    } catch {
      /* ignore */
    }
  }
}

export async function postPanelToChannel(client) {
  try {
    const ch = await client.channels.fetch(config.panelChannelId);
    if (!ch?.isTextBased()) return;

    const messages = await ch.messages.fetch({ limit: 20 });
    const existing = messages.find(
      (m) => m.author.id === client.user.id && m.embeds[0]?.title?.includes('Sains Reborn')
    );
    if (existing) return;

    await ch.send({
      embeds: [buildPanelEmbed()],
      components: buildPanelComponents(),
    });
  } catch {
    /* ignore */
  }
}
