const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('shuffle').setDescription('Acak urutan antrian.'),

  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue || queue.songs.length <= 2) {
      return interaction.reply({ content: '❌ Lagu di antrian belum cukup untuk diacak.', flags: MessageFlags.Ephemeral });
    }
    await queue.shuffle();
    await interaction.reply('🔀 Antrian diacak.');
  },
};
