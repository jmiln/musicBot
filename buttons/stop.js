const { useMainPlayer, useQueue } = require("discord-player");

module.exports = {
    name: "stop_song",
    async run(interaction) {
        const player = useMainPlayer();
        // const queue = player?.nodes.get(interaction.guild.id);
        const queue = useQueue(interaction.guild.id);

        if (!queue?.isPlaying()) {
            return await interaction.reply({
                embeds: [
                    {
                        description: "There isn't currently any music playing.",
                    },
                ],
                ephemeral: true,
            });
        }

        queue.node.stop();

        return await interaction.reply({
            embeds: [
                {
                    description: `<@${interaction.user.id}>: The music has been stopped.`,
                },
            ],
        });
    },
};
