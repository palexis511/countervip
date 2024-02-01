const fs = require("fs");
const {Client, Intents, Collection} = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const client = new Client({
  fetchAllMembers: true,
  intents:[
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_INTEGRATIONS,
  ]});
const {token} = require("./config.json");

const {Player} = require("discord-player");
global.client = client;
client.commands = (global.commands = []);
fs.readdir("./slashcommandes/", (err, files) => {
    if (err) throw err;

    files.forEach((file) => {
        if (!file.endsWith(".js")) return;
        let props = require(`./slashcommandes/${file}`);

        client.commands.push({
             name: props.name.toLowerCase(),
             description: props.description,
             options: props.options,
            // type:'CHAT_INPUT',
        })
        console.log(`👌 Commande chargée : ${props.name}`);
    });
});

fs.readdir("./events/", (_err, files) => {
    files.forEach((file) => {
        if (!file.endsWith(".js")) return;
        const event = require(`./events/${file}`);
        let eventName = file.split(".")[0];
        
        console.log(`👌 Événement chargé : ${eventName}`);
        client.on(eventName, (...args) => {
           event(client, ...args);
        });
    });
});

client.on("ready", async () => {
  
    const rest = new REST({ version: "9" }).setToken(token);

  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: client.commands,
    });
  } catch (error) {
    console.error(error);
  }
});
const player = new Player(client, {
  ytdlOptions: {
      quality: "highestaudio",
      highWaterMark: 1 << 25,
  },
});

//ANTI CRASH
process.on("unhandledRejection", (reason, p) => {
    console.log(reason, p);
});
process.on("uncaughtException", (err, origin) => {
    console.log(err, origin);
});
process.on("multipleResolves", (type, promise, reason) => {
    console.log(type, promise, reason);
});
var regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;
client.on("warn", e => {
    console.log(e.replace(regToken, "that was redacted"));
});
client.on("error", e => {
    console.log(e.replace(regToken, "that was redacted"));
});

client.snipes = new Map()
client.on('messageDelete', function (message, channel) {

    client.snipes.set(message.channel.id, {
        content: message.content,
        author: message.author,
        image: message.attachments.first() ? message.attachments.first().proxyURL : null
    })
})

const UPDATE_INTERVAL_SECONDS = 60; // Interval de mise à jour en secondes

// À la connexion du bot
client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}!`);
    setIntervalSafe(updateTotalMembersCount, UPDATE_INTERVAL_SECONDS * 1000); // Mise à jour toutes les 60 secondes
    setIntervalSafe(updateOnlineMembersCount, (UPDATE_INTERVAL_SECONDS + 5) * 1000); // Mise à jour toutes les 65 secondes
    setIntervalSafe(updateVoiceMembersCount, (UPDATE_INTERVAL_SECONDS + 10) * 1000); // Mise à jour toutes les 70 secondes
});

client.on('error', console.error);
client.on('reconnecting', () => console.log('Reconnexion au WebSocket...'));
client.on('disconnect', () => console.log('Déconnecté, tentative de reconnexion...'));

// Mise à jour du nombre total de membres
async function updateTotalMembersCount() {
    client.guilds.cache.forEach(async guild => {
        try {
            await guild.fetch();
            const memberCount = guild.memberCount;
            await updateChannelByName(guild, '👤・Membres', `👤・Membres : ${memberCount}`);
        } catch (err) {
            console.error(`Erreur lors de la mise à jour des membres pour ${guild.id}:`, err);
        }
    });
}

// Mise à jour du nombre de membres en ligne
async function updateOnlineMembersCount() {
    client.guilds.cache.forEach(async guild => {
        try {
            const onlineMembersCount = guild.members.cache.filter(member => member.presence && member.presence.status !== 'offline').size;
            await updateChannelByName(guild, '🌟・En ligne', `🌟・En ligne : ${onlineMembersCount}`);
        } catch (err) {
            console.error(`Erreur lors de la mise à jour des membres en ligne pour ${guild.id}:`, err);
        }
    });
}

// Mise à jour du nombre de membres en vocal
async function updateVoiceMembersCount() {
    client.guilds.cache.forEach(async guild => {
        try {
            const voiceMembersCount = calculateVoiceMembers(guild);
            await updateChannelByName(guild, '🔊・En vocal', `🔊・En vocal : ${voiceMembersCount}`);
        } catch (err) {
            console.error(`Erreur lors de la mise à jour des membres en vocal pour ${guild.id}:`, err);
        }
    });
}

// Calcul du nombre de membres en vocal
function calculateVoiceMembers(guild) {
    return guild.channels.cache.filter(c => c.type === 'GUILD_VOICE')
        .map(c => c.members.size)
        .reduce((acc, count) => acc + count, 0);
}

// Mise à jour du nom du canal par son nom
async function updateChannelByName(guild, channelNameStartsWith, newName) {
    const channel = guild.channels.cache.find(c => c.name.startsWith(channelNameStartsWith));
    if (channel) {
        await channel.setName(newName).catch(err => console.error(`Erreur lors de la mise à jour du canal ${channel.name}:`, err));
    } else {
        console.error(`Canal commençant par "${channelNameStartsWith}" introuvable dans le serveur ${guild.id}.`);
    }
}

// Fonction pour retarder l'exécution
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fonction pour exécuter un intervalle de manière sûre
function setIntervalSafe(myFunction, interval) {
    let isFunctionRunning = false;

    setInterval(async () => {
        if (!isFunctionRunning) {
            isFunctionRunning = true;
            try {
                await myFunction();
            } catch (error) {
                console.error("Erreur lors de l'exécution de la fonction:", error);
            }
            isFunctionRunning = false;
        }
    }, interval);
}

// Gestion des mises à jour de présence
client.on('presenceUpdate', (oldPresence, newPresence) => {
    try {
        // Vérifiez si newPresence et newPresence.guild existent
        if (!newPresence || !newPresence.guild) {
            console.error('Impossible de récupérer les informations de guilde pour la mise à jour de la présence.');
            return;
        }

        // Reste de votre logique de gestion de la mise à jour de la présence
    } catch (error) {
        console.error("Erreur dans presenceUpdate:", error);
    }
});

player.on("error", (queue, error) => {
  console.log(`[${queue.guild.name}] Erreur de queue : ${error.message}`);
});
player.on("connectionError", (queue, error) => {
  console.log(`[${queue.guild.name}] Erreur causée par la connexion : ${error.message}`);
});
player.on("botDisconnect", (queue) => {
  queue.metadata.send("❌ | J'ai été déconnecté manuellement du canal audio, file d'attente effacée !");
});
player.on("channelEmpty", (queue) => {
  queue.metadata.send("❌ | Personne sur le canal vocal, je quitte...");
});

player.on("queueEnd", (queue) => {
  queue.metadata.send("✅ | La file d'attente est complète !");
});
client.login(token);