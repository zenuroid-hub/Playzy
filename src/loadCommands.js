const fs = require('node:fs');
const path = require('node:path');

/**
 * Memuat semua file command dari folder src/commands.
 * @returns {Map<string, { data: object, execute: Function }>}
 */
function loadCommands() {
  const commands = new Map();
  const dir = path.join(__dirname, 'commands');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const command = require(path.join(dir, file));
    if (command?.data?.name && typeof command.execute === 'function') {
      commands.set(command.data.name, command);
    } else {
      console.warn(`[loadCommands] ${file} dilewati: tidak punya "data" atau "execute" yang valid.`);
    }
  }
  return commands;
}

module.exports = { loadCommands };
