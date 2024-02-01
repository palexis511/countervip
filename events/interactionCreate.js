const fs = require("fs");

module.exports = (client, interaction) => {
    if (!interaction.isCommand()) return;
    try {
      fs.readdir("./slashcommandes/", (err, files) => {
        if (err) throw err;

        files.forEach(async (f) => {
          const command = require(`../slashcommandes/${f}`);
          if (
            interaction.commandName.toLowerCase() === command.name.toLowerCase()
          ) {
            return command.run(client, interaction);
          }
        });
      });
    } catch (err) {
      console.error(err);
    }
};