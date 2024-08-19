module.exports = async (Bot, guild) => {
    // Make sure it's not a server outage that's causing it to show as leaving/ re-joining
    if (!guild.available) return;

    // Log that the bot left
    Bot.logger.log(`[GuildDelete] I left ${guild.name}(${guild.id})`);
};
