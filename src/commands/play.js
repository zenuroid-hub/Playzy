const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { resolveQuery, isURL } = require('../search');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Putar lagu dari judul atau URL (YouTube / SoundCloud / dll).')
    .addStringOption((o) =>
      o
        .setName('query')
        .setDescription('Judul lagu atau URL (YouTube, SoundCloud, playlist, dll).')
        .setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName('source')
        .setDescription('Sumber pencarian saat memakai judul (default: YouTube).')
        .addChoices(
          { name: 'YouTube', value: 'youtube' },
          { name: 'SoundCloud', value: 'soundcloud' },
        ),
    ),

  async execute(interaction, distube) {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ Kamu harus berada di voice channel dulu!',
        flags: MessageFlags.Ephemeral,
      });
    }

    const query = interaction.options.getString('query');
    const source = interaction.options.getString('source') ?? 'youtube';
    await interaction.deferReply();

    try {
      // URL diputar langsung; judul/teks di-resolve dulu jadi URL lewat yt-dlp search.
      const { url, fromSearch } = await resolveQuery(query, source);

      if (fromSearch) {
        const label = source === 'soundcloud' ? 'SoundCloud' : 'YouTube';
        await interaction.editReply(`🔎 Mencari di ${label}: \`${query}\``);
      } else {
        await interaction.editReply(`🔗 Memproses tautan: \`${query}\``);
      }

      await distube.play(voiceChannel, url, {
        member: interaction.member,
        textChannel: interaction.channel,
        metadata: { interaction },
      });
    } catch (err) {
      console.error('[play]', err);
      await interaction.editReply(`❌ Gagal memutar: ${String(err.message ?? err).slice(0, 1800)}`);
    }
  },
};
