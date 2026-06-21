const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Atur volume (0-150).')
    .addIntegerOption((o) =>
      o.setName('persen').setDescription('Level volume 0-150').setRequired(true).setMinValue(0).setMaxValue(150),
    ),

  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ Tidak ada lagu yang diputar.', flags: MessageFlags.Ephemeral });
    }
    const vol = interaction.options.getInteger('persen');
    queue.setVolume(vol);
    await interaction.reply(`🔊 Volume diatur ke **${vol}%**.`);
  },
};
