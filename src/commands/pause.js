const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Jeda lagu yang sedang diputar.'),

  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ Tidak ada lagu yang diputar.', flags: MessageFlags.Ephemeral });
    }
    if (queue.paused) {
      return interaction.reply({ content: '⏸️ Lagu sudah dalam keadaan jeda.', flags: MessageFlags.Ephemeral });
    }
    queue.pause();
    await interaction.reply('⏸️ Lagu dijeda. Gunakan `/resume` untuk melanjutkan.');
  },
};
