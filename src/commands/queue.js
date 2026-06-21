const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Tampilkan antrian lagu.'),

  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs.length) {
      return interaction.reply({ content: '📭 Antrian kosong.', flags: MessageFlags.Ephemeral });
    }

    const list = queue.songs
      .slice(0, 10)
      .map((song, i) => {
        const prefix = i === 0 ? '▶️ **Sekarang:**' : `\`${i}.\``;
        return `${prefix} [${song.name}](${song.url}) \`(${song.formattedDuration})\``;
      })
      .join('\n');

    const extra = queue.songs.length > 10 ? `\n…dan ${queue.songs.length - 10} lagu lainnya.` : '';

    const embed = new EmbedBuilder()
      .setColor(0x1db954)
      .setTitle(`🎵 Antrian — ${queue.songs.length} lagu`)
      .setDescription(list + extra)
      .setFooter({ text: `Volume: ${queue.volume}% • Loop: ${['off', 'lagu', 'antrian'][queue.repeatMode]}` });

    await interaction.reply({ embeds: [embed] });
  },
};
