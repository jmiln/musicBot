const Command = require("../base/slashCommand");
const { useMainPlayer } = require("discord-player");
const { buttonRow } = require("../modules/buttons.js");

class Queue extends Command {
    constructor(Bot) {
        super(Bot, {
            name: "queue",
            description: "See what's in your queue",
            guildOnly: false,
        });
    }

    async run(Bot, interaction) {
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.reply("You are not connected to a voice channel!"); // make sure we have a voice channel

        const player = useMainPlayer();
        if (!player) return super.error(interaction, "No player found/ couldn't make one.");

        // let's defer the interaction as things can take time to process
        await interaction.deferReply();

        const queue = player.nodes.get(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return super.error(interaction, "There isn't currently any music playing.");
        }

        const queuedTracks = queue.tracks.toArray();

        if (!queuedTracks?.length) {
            return super.error(interaction, "There aren't any other tracks in the queue.");
        }

        const tracks = queuedTracks.map((track, ix) => {
            return `\`${ix + 1}\` [${track.title}](${track.url}) by **${track.author}**`;
        });
        const songs = queuedTracks.length;
        const nextSongs = songs > 5 ? `And **${songs - 5}** other ${songs - 5 > 1 ? "tracks" : "track"} currently in queue.` : "";
        const progress = queue.node.createProgressBar();

        return interaction.editReply({
            embeds: [
                {
                    title: `Server Queue - ${interaction.guild.name}`,
                    description: `**Current Track**: [${queue.currentTrack?.title}](${queue.currentTrack?.url}) by **${queue.currentTrack?.author}**\n${progress}\n\n${tracks.slice(0, 5).join("\n")}\n\n${nextSongs}`,
                    thumbnail: {
                        url: queue.currentTrack?.thumbnail,
                    },
                },
            ],
            components: [buttonRow],
        });
    }
}

module.exports = Queue;
