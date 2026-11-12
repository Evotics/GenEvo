import { SlashCommandBuilder } from 'discord.js';
import { revokeUser } from '../utils/database.js';
import { isAdmin, sendLog, removeAccessRoles } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('revoke')
  .setDescription('Revoke a user\'s key access and generation privileges')
  .addUserOption((o) =>
    o.setName('user').setDescription('User to revoke').setRequired(true)
  );

export async function execute(interaction) {
  if (!isAdmin(interaction)) {
    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }

  const target = interaction.options.getUser('user');
  revokeUser(target.id);

  try {
    const member = await interaction.guild.members.fetch(target.id);
    await removeAccessRoles(member);
  } catch {
    /* user may have left */
  }

  await interaction.reply({
    content: `✅ Revoked access for <@${target.id}>. Their credits have been cleared and roles removed.`,
    ephemeral: true,
  });

  await sendLog(interaction.client, '🚫 Access Revoked', [
    { name: 'Admin', value: `<@${interaction.user.id}>`, inline: true },
    { name: 'User', value: `<@${target.id}>`, inline: true },
  ], 0xed4245);
}
