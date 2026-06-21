const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Lewati lagu yang sedang diputar.'),

  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ Tidak ada lagu yang diputar.', flags: MessageFlags.Ephemeral });
    }
    try {
      if (queue.songs.length <= 1 && !queue.autoplay) {
        await queue.stop();
        return interaction.reply('⏭️ Lagu terakhir dilewati, antrian berhenti.');
      }
      const song = await queue.skip();
      await interaction.reply(`⏭️ Dilewati. Sekarang: **${song.name}**`);
    } catch (err) {
      await interaction.reply({ content: `❌ ${err.message}`, flags: MessageFlags.Ephemeral });
    }
  },
};
