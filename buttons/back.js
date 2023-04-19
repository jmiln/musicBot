const { useMasterPlayer } = require("discord-player");

module.exports = {
    name: "prev_song",
    async run(interaction) {
        const player = useMasterPlayer();
        const queue = player?.nodes.get(interaction.guild.id);

        if (!queue?.history.tracks.toArray().length) {
            return await interaction.reply({ embeds: [{
                description: "There was no music played before this track."
            }], ephemeral: true, });
        }

        await queue.history.back();

        return await interaction.reply({ embeds: [ {
            description: `<@${interaction.user.id}>: Returning to the previous track in queue.`
        }]});
    }
};
