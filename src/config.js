require('dotenv').config();

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN) throw new Error('DISCORD_TOKEN belum diisi di file .env');
if (!CLIENT_ID) throw new Error('CLIENT_ID belum diisi di file .env');

module.exports = {
  token: DISCORD_TOKEN,
  clientId: CLIENT_ID,
  guildId: GUILD_ID || null,
};
