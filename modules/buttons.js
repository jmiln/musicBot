const { SlashCommandBuilder, ButtonBuilder } = require("@discordjs/builders");
const { EmbedBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");

const emojis = {
    stop: {name: "⏹"},
    skip: {name: "⏭"},
    queue: {name: "📜"},
    pause_play: {name: "⏯"},
    back: {name: "⏮"}
};

module.exports = {
    buttonRow: new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("prev_song")
            .setEmoji(emojis.back)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("pause_play_song")
            .setEmoji(emojis.pause_play)
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId("skip_song")
            .setEmoji(emojis.skip)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("stop_song")
            .setEmoji(emojis.stop)
            .setStyle(ButtonStyle.Danger),
    ).toJSON()
};
