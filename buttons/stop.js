const { useMasterPlayer } = require("discord-player");

module.exports = {
    name: "stop_song",
    async run(interaction) {
        const player = useMasterPlayer();
        const queue = player?.nodes.get(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return await interaction.reply({ embeds: [{
                description: "There isn't currently any music playing."
            }], ephemeral: true, });
        }

        queue.delete();

        return await interaction.reply({ embeds: [ {
            description: `<@${interaction.user.id}>: The music has been stopped.`
        }]});
    }
};
