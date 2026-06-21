const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Hentikan musik dan kosongkan antrian.'),

  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ Tidak ada lagu yang diputar.', flags: MessageFlags.Ephemeral });
    }
    await queue.stop();
    await interaction.reply('⏹️ Musik dihentikan dan antrian dikosongkan.');
  },
};
