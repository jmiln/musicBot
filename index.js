const { Client, Collection, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { readdirSync } = require("node:fs");
const { inspect } = require("node:util");
const { Player } = require("discord-player");

const { buttonRow } = require("./modules/buttons.js");
const { DefaultExtractors } = require("@discord-player/extractor");
const { SpotifyExtractor } = require("discord-player-spotify");

const Bot = {};

// Attach the config to the Bot so we can use it anywhere
Bot.config = require("./config.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
    // closeTimeout: 30_000,
});

const player = new Player(client);

player.events.on("playerStart", (queue, track) => {
    // we will later define queue.metadata object while creating the queue
    const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🎶 | Now Playing")
        .setDescription(`**${track.title}**`)
        .setThumbnail(track.thumbnail)
        .addFields([
            { name: "DURATION", value: `${track?.duration ? track.duration : "N/A"}s`, inline: true },
            { name: "REQUESTER", value: `${track.requestedBy}`, inline: true },
            { name: "ARTIST", value: track.author, inline: true },
            { name: "URL", value: `**[Click Here](${track.url})**`, inline: false },
        ]);
    queue.metadata.channel.send({
        embeds: [ embed ],
        components: [buttonRow],
    });
});
// player.on("debug", async (message) => {
//     // Emitted when the player sends debug info
//     // Useful for seeing what dependencies, extractors, etc are loaded
//     console.log(`General player debug event: ${message}`);
// });
// player.events.on("debug", async (queue, message) => {
//     // Emitted when the player queue sends debug info
//     // Useful for seeing what state the current queue is at
//     console.log(`Player debug event: ${message}`);
// });
player.events.on("error", (queue, error) => {
    // Emitted when the player queue encounters error
    console.log(`General player error event: ${error.message}`);
    console.log(error);
});
player.events.on("playerError", (queue, error, track) => {
    // Emitted when the audio player errors while streaming audio track
    console.log(`Player error event: ${error.message}`);
    console.log(`Track: ${track.title}\nAuthor: ${track.author}\nURL: ${track.url}`);
    console.log(error);
});
// player.events.on("audioTrackAdd", (queue, track) => {
//     // Emitted when the player adds a single song to its queue
//     queue.metadata.channel.send(`Track **${track.title}** queued`);
// });
//
// player.events.on("audioTracksAdd", (queue, track) => {
//     // Emitted when the player adds multiple songs to its queue
//     queue.metadata.channel.send("Multiple Track's queued");
// });

player.events.on("playerSkip", (queue, track) => {
    // Emitted when the audio player fails to load the stream for a song
    queue.metadata.channel.send(`Skipping **${track.title}** due to an issue!`);
});

player.events.on("disconnect", (queue) => {
    // Emitted when the bot leaves the voice channel
    queue.metadata.channel.send("Looks like my job here is done, leaving now!");
});
player.events.on("emptyChannel", (queue) => {
    // Emitted when the voice channel has been empty for the set threshold
    // Bot will automatically leave the voice channel with this event
    queue.metadata.channel.send("Leaving because the channel was empty.");
});
player.events.on("emptyQueue", (queue) => {
    // Emitted when the player queue has finished
    queue.metadata.channel.send("Queue finished!");
});

// Load in various general functions for the bot
require("./modules/functions.js")(Bot, client);

// Set up a collection for the slash commands and buttons
client.slashcmds = new Collection();
client.buttons = new Collection();

const init = async () => {
    await player.extractors.register(SpotifyExtractor, {
        market: "US"
    });
    await player.extractors.loadMulti(DefaultExtractors);

    const Logger = require("./modules/Logger.js");
    Bot.logger = new Logger(Bot, client);

    // Here we load Slash Commands into memory, as a collection, so they're accessible
    // here and everywhere else.
    const slashFiles = readdirSync("./slash/");
    const slashError = [];
    for (const file of slashFiles) {
        try {
            if (!file.endsWith(".js")) return;
            const commandName = file.split(".")[0];
            const result = client.loadSlash(commandName);
            if (result) slashError.push(`Unable to load command: ${commandName}`);
        } catch (err) {
            console.error(err);
            break;
        }
    }
    if (slashError.length) {
        Bot.logger.warn(`slashLoad: ${slashError.join("\n")}`);
    }

    // Then we load events, which will include our message and ready event.
    const evtFiles = readdirSync("./events/");
    for (const file of evtFiles) {
        const eventName = file.split(".")[0];
        const event = require(`./events/${file}`);
        if (["ready", "interactionCreate", "messageCreate", "guildMemberAdd", "guildMemberRemove"].includes(eventName)) {
            client.on(eventName, event.bind(null, Bot, client));
        } else {
            client.on(eventName, event.bind(null, Bot));
        }
        delete require.cache[require.resolve(`./events/${file}`)];
    }

    // Then the buttons
    const buttonFiles = readdirSync("./buttons/");
    const buttonError = [];
    for (const file of buttonFiles) {
        if (!file.endsWith(".js")) return;
        const buttonName = file.split(".")[0];
        const buttonPath = `./buttons/${file}`;
        try {
            const button = require(buttonPath);
            client.buttons.set(button.name, button);
            delete require.cache[require.resolve(buttonPath)];
        } catch (err) {
            buttonError.push(`Unable to load button: ${buttonName}`);
            console.error(err);
            break;
        }
    }
    if (buttonError.length) {
        Bot.logger.warn(`buttonLoad: ${buttonError.join("\n")}`);
    }

    process.on("uncaughtException", (err) => {
        const errorMsg = err.stack?.replace(new RegExp(`${process.cwd()}`, "g"), ".");
        console.error(`[${Bot.myTime()}] Uncaught Exception: ${errorMsg}`);

        // If it's that error, don't bother showing it again
        try {
            if (!errorMsg?.startsWith("Error: RSV2 and RSV3 must be clear") && Bot.config.logs.logToChannel) {
                client.channels.cache.get(Bot.config.logs.channel)?.send("```inspect(errorMsg)```", { split: true });
            }
        } catch (e) {
            // Don't bother doing anything
        }
        // Always best practice to let the code crash on uncaught exceptions.
        // Because you should be catching them anyway.
        process.exit(1);
    });

    process.on("unhandledRejection", (err) => {
        const errorMsg = err.stack.replace(new RegExp(process.cwd(), "g"), ".");

        // If it's something I can't do anything about, ignore it
        const ignoreArr = [
            "Internal Server Error", // Something on Discord's end
            "The user aborted a request", // Pretty sure this is also on Discord's end
            "Cannot send messages to this user", // A user probably has the bot blocked or doesn't allow DMs (No way to check for that)
            "Unknown Message", // Not sure, but seems to happen when someone deletes a message that the bot is trying to reply to?
        ];
        const errStr = ignoreArr.find((elem) => errorMsg.includes(elem));
        if (errStr) {
            return console.error(`[${Bot.myTime()}] Uncaught Promise Error: ${errStr}`);
        }
        // console.log(err);
        console.error(`[${Bot.myTime()}] Uncaught Promise Error: ${errorMsg}`);
        try {
            if (Bot.config.logs.logToChannel) {
                client.channels.cache.get(Bot.config.logs.channel)?.send(`\`\`\`${inspect(errorMsg)}\`\`\``, { split: true });
            }
        } catch (e) {
            // Don't bother doing anything
        }
    });
};

init();
client.login(Bot.config.token);
