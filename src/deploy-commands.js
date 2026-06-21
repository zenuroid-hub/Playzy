const { REST, Routes } = require('discord.js');
const { token, clientId, guildId } = require('./config');
const { loadCommands } = require('./loadCommands');

const commands = [...loadCommands().values()].map((c) => c.data.toJSON());
const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Mendaftarkan ${commands.length} slash command...`);
    if (guildId) {
      // Registrasi per-guild: langsung muncul (cocok untuk development).
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`✅ Terdaftar di guild ${guildId} (instan).`);
    } else {
      // Registrasi global: bisa butuh sampai ~1 jam untuk tersebar.
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('✅ Terdaftar secara global (mungkin butuh hingga 1 jam untuk muncul).');
    }
  } catch (err) {
    console.error('Gagal mendaftarkan command:', err);
    process.exit(1);
  }
})();
