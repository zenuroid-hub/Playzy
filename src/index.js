const { Client, GatewayIntentBits, Events, MessageFlags } = require('discord.js');
const { token } = require('./config');
const { setupDistube } = require('./music');
const { loadCommands } = require('./loadCommands');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates, // wajib agar bot bisa join & deteksi voice channel
  ],
});

// Setup DisTube + muat command.
const distube = setupDistube(client);
const commands = loadCommands();
console.log(`Memuat ${commands.size} command: ${[...commands.keys()].join(', ')}`);

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Bot login sebagai ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.inGuild()) {
    return interaction.reply({ content: '❌ Command hanya bisa dipakai di dalam server.', flags: MessageFlags.Ephemeral });
  }

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, distube);
  } catch (err) {
    console.error(`[interaction:${interaction.commandName}]`, err);
    const payload = { content: '❌ Terjadi kesalahan saat menjalankan command.', flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) {
      interaction.editReply(payload).catch(() => {});
    } else {
      interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(token);
