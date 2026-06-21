const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Atur mode pengulangan.')
    .addStringOption((o) =>
      o
        .setName('mode')
        .setDescription('Pilih mode loop')
        .setRequired(true)
        .addChoices(
          { name: 'Mati', value: '0' },
          { name: 'Ulangi lagu ini', value: '1' },
          { name: 'Ulangi seluruh antrian', value: '2' },
        ),
    ),

  async execute(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ Tidak ada lagu yang diputar.', flags: MessageFlags.Ephemeral });
    }
    const mode = Number(interaction.options.getString('mode'));
    queue.setRepeatMode(mode);
    const label = ['❌ Mati', '🔂 Ulangi lagu ini', '🔁 Ulangi seluruh antrian'][mode];
    await interaction.reply(`Mode loop: **${label}**`);
  },
};
