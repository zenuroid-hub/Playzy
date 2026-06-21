const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Lanjutkan lagu yang dijeda.'),

  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ Tidak ada lagu yang diputar.', flags: MessageFlags.Ephemeral });
    }
    if (!queue.paused) {
      return interaction.reply({ content: '▶️ Lagu sedang berjalan.', flags: MessageFlags.Ephemeral });
    }
    queue.resume();
    await interaction.reply('▶️ Lagu dilanjutkan.');
  },
};
