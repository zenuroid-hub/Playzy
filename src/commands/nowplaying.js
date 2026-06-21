const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Tampilkan lagu yang sedang diputar.'),

  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs.length) {
      return interaction.reply({ content: '❌ Tidak ada lagu yang diputar.', flags: MessageFlags.Ephemeral });
    }

    const song = queue.songs[0];

    // Bar progres sederhana.
    const total = song.duration || 1;
    const current = Math.min(queue.currentTime, total);
    const size = 18;
    const pos = Math.max(0, Math.min(size - 1, Math.round((current / total) * size)));
    const bar = '▬'.repeat(pos) + '🔘' + '▬'.repeat(size - pos - 1);

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle('🎶 Sedang diputar')
      .setDescription(`**[${song.name}](${song.url})**`)
      .addFields(
        { name: 'Progres', value: `\`${queue.formattedCurrentTime} / ${song.formattedDuration}\`\n${bar}` },
        { name: 'Diminta oleh', value: `${song.user}`, inline: true },
        { name: 'Status', value: queue.paused ? '⏸️ Jeda' : '▶️ Berjalan', inline: true },
      )
      .setThumbnail(song.thumbnail ?? null);

    await interaction.reply({ embeds: [embed] });
  },
};
