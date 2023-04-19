module.exports = async (Bot, client) => {
    // Grab a list of all the command names
    Bot.commandList = [...client.slashcmds.keys()];

    let readyString = `${client.user.username} is ready to serve in ${client.guilds.cache.size} servers.`;
    if (client.shard) {
        readyString = `${client.user.username} is ready to serve in ${client.guilds.cache.size} servers. Shard #${client.shard.id}`;
    }

    console.log(Bot.commandList);

    Bot.logger.log(readyString, "ready", true);

    setTimeout(async () => {
        await Bot.deployCommands();
    }, 20 * 1000);
};
