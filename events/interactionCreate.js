const { inspect } = require("node:util");
const { useMainPlayer, useQueue } = require("discord-player");
const { GuildMember } = require("discord.js");
const config = require("../config");

const ignoreArr = [
    "DiscordAPIError: Missing Access",
    "HTTPError [AbortError]: The user aborted a request.",
    "Internal Server Error", // Something on Discord's end
    "The user aborted a request", // Pretty sure this is also on Discord's end
    "Cannot send messages to this user", // A user probably has the bot blocked or doesn't allow DMs (No way to check for that)
    "Unknown interaction", // Not sure, but seems to happen when someone deletes an interaction that the bot is trying to reply to?
    "Unknown message", // Not sure, but seems to happen when someone deletes a message that the bot is trying to reply to?
];

module.exports = async (Bot, client, interaction) => {
    // If it's not a command, don't bother trying to do anything
    // if (
    //     !interaction?.isChatInputCommand() &&
    //     !interaction.isAutocomplete() &&
    // ) return;

    // If it's a bot trying to use it, don't bother
    if (interaction.user.bot) return;

    if (interaction.isChatInputCommand()) {
        // Grab the command data from the client.slashcmds Collection
        const cmd = client.slashcmds.get(interaction.commandName);

        // If that command doesn't exist, silently exit and do nothing
        if (!cmd) return;

        // Grab the settings for this server, and if there's no guild, just give it the defaults
        // Attach the guildsettings to the interaction to make it easier to grab later
        // interaction.guildSettings = await Bot.getGuildSettings(interaction?.guild?.id);

        // Get the user or member's permission level from the elevation
        // const level = await Bot.permLevel(interaction);

        // Make sure the user has the correct perms to run the command
        // if (level < cmd.commandData.permLevel) {
        //     return interaction.reply({content: "Sorry, but you don't have permission to run that command.", ephemeral: true});
        // }

        // Run the command
        try {
            if (config.userBlacklist.includes(interaction.user.id)) {
                return interaction.reply({ content: "Sorry, but you don't have permission to run that command.", ephemeral: true });
            }
            await cmd.run(Bot, interaction);
            // console.log(`[interCreate] Trying to run: ${cmd.commandData.name}\n - Options: ${inspect(interaction.options, {depth: 5})}`);
        } catch (err) {
            if (cmd.commandData.name === "test") {
                return console.log(
                    `ERROR(inter) (user: ${interaction.user.id}) I broke with ${cmd.commandData.name}: \nOptions: ${inspect(interaction.options, { depth: 5 })} \n${inspect(err, { depth: 5 })}`,
                    true,
                );
            }

            if (ignoreArr.some((str) => err.toString().includes(str))) {
                // Don't bother spitting out the whole mess.
                // Log which command broke, and the first line of the error
                logErr(
                    `ERROR(inter) (user: ${interaction.user.id}) I broke with ${cmd.commandData.name}: \n${err.toString().split("\n")[0]}`,
                );
            } else {
                logErr(
                    `ERROR(inter) (user: ${interaction.user.id}) I broke with ${cmd.commandData.name}: \nOptions: ${inspect(interaction.options, { depth: 5 })} \n${inspect(err, { depth: 5 })}`,
                    true,
                );
            }

            const replyObj = { content: "It looks like something broke when trying to run that command.", ephemeral: true };
            if (interaction.replied) {
                return interaction
                    .followUp(replyObj)
                    .catch((e) => logErr(`[cmd:${cmd.commandData.name}] Error trying to send followUp error message: \n${e}`));
            }
            if (interaction.deferred) {
                return interaction
                    .editReply(replyObj)
                    .catch((e) => logErr(`[cmd:${cmd.commandData.name}] Error trying to send editReply error message: \n${e}`));
            }
            return interaction
                .reply(replyObj)
                .catch((e) => logErr(`[cmd:${cmd.commandData.name}] Error trying to send reply error message: \n${e}`));
        }
    } else if (interaction.isButton()) {
        const button = client.buttons.get(interaction.customId);
        if (!button) return;

        try {
            const queue = useQueue(interaction.guildId);

            // If there is no queue or the bot is not in a voice channel, then move along
            if (!queue?.dispatcher) return;

            if (interaction.member instanceof GuildMember && interaction.member.voice.channel?.id !== queue.dispatcher.channel.id) {
                return interaction.reply({
                    embeds: [{
                        title: "Error",
                        description: "You need to be in the same voice channel as me to use song buttons.",
                        color: Bot.constants.colors.red
                    }],
                    ephemeral: true,
                });
            }
            await button.run(interaction, client);
        } catch (error) {
            Bot.logger.error("An error occurred whilst attempting to execute a button command:");
            Bot.logger.error(error);
        }
    }

    function logErr(errStr, useWebhook = false) {
        if (ignoreArr.some((str) => errStr.toString().includes(str))) return;
        Bot.logger.error(errStr, useWebhook);
    }
};
