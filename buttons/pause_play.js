const { useQueue } = require("discord-player");

module.exports = {
    name: "pause_play_song",
    async run(interaction) {
        const queue = useQueue(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return await interaction.reply({
                embeds: [
                    {
                        description: "There isn't currently any music playing.",
                    },
                ],
                ephemeral: true,
            });
        }

        queue.node.setPaused(!queue.node.isPaused());

        return await interaction.reply({
            embeds: [
                {
                    description: `<@${interaction.user.id}>: Successfully ${queue.node.isPaused() ? "paused" : "unpaused"} **[${queue.currentTrack?.title}](${queue.currentTrack?.url})**.`,
                },
            ],
        });
    },
};
