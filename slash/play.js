const Command = require("../base/slashCommand");
const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const { useMainPlayer } = require("discord-player");

// 993765001892474984

class Play extends Command {
    constructor(Bot) {
        super(Bot, {
            name: "play",
            description: "Play a song or playlist",
            guildOnly: false,
            options: [{
                name: "track",
                type: ApplicationCommandOptionType.String,
                description: "The song or playlist to try and play",
                required: true,
            }]
        });
    }

    async run(Bot, interaction) {
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.reply("You are not connected to a voice channel!"); // make sure we have a voice channel
        const query = interaction.options.getString("track"); // we need input/query to play
        const player = useMainPlayer();
        if (!player) return super.error(interaction, "No player found/ couldn't make one.");

        // let's defer the interaction as things can take time to process
        await interaction.deferReply();

        let queue = player.nodes.get(interaction.guild.id);
        if (!queue) {
            player.nodes.create(interaction.guild.id, {
                selfDeaf: true,
                leaveOnEnd: false,
                leaveOnStop: false,
                leaveOnEmpty: true,
                metadata: {
                    channel: interaction.channel,
                    client: interaction.guild.members.me,
                    requestedBy: interaction.user,
                },
            });

            // Re-get the queue since it needed to be created
            queue = player.nodes.get(interaction.guild.id);
        }

        if (!queue) return super.error(interaction, "No queue found/ couldn't make one.");

        try {
            const res = await player.search(query, {
                requestedBy: interaction.user,
            });

            if (!res || !res.tracks || res.tracks.length === 0) {
                return interaction.editReply({
                    embeds: [{
                        description: `❌ | No Video/Song/Playlist was found when searching for: ${query}`,
                    }],
                    ephemeral: true,
                    color: "Red"
                });
            }

            try {
                if (!queue.connection) await queue.connect(interaction.member.voice.channel);
            } catch (err) {
                return super.error(interaction, "I can't join that voice channel.");
            }

            try {
                res.playlist ? queue.addTrack(res.tracks) : queue.addTrack(res.tracks[0]);
                if (!queue.isPlaying()) await queue.node.play(queue.tracks[0]);
            } catch (err) {
                Bot.logger.error("An error occurred whilst attempting to play this media:");
                Bot.logger.error(err);

                return super.error(interaction, "This media doesn't seem to be working right now, please try again later.");
            }


            const playEmbed = new EmbedBuilder()
                .setColor("Random")
                .setTitle(
                    `🎶 | New ${res.playlist ? "playlist" : "song"} Added to queue. ${res.playlist ? res.tracks.length + " tracks added" : "" }`,
                );
            if (!res.playlist) {
                const tr = res.tracks[0];
                playEmbed.setThumbnail(tr.thumbnail);
                playEmbed.setDescription(`[${tr.title}](${tr.url}) by **${tr.author}**`);
            } else {
                playEmbed.setDescription(`**${res.tracks.length} tracks** from the ${res.playlist.type} **[${res.playlist.title}](${res.playlist.url})** have been loaded into the server queue.`);
                // console.log(`[musico /play] Playing playlist with ${res.tracks.length} tracks.\n${res.tracks.map(tr => " - " + tr.title).join("\n")}`);
            }

            return await interaction.editReply({ embeds: [playEmbed] });

            // if (!res.playlist) {
            //     return super.success(interaction, `Loaded **[${res.tracks[0].title}](${res.tracks[0].url})** by **${res.tracks[0].author}** into the server queue.`);
            // } else {
            //     return super.success(interaction, `**${res.tracks.length} tracks** from the ${res.playlist.type} **[${res.playlist.title}](${res.playlist.url})** have been loaded into the server queue.`);
            // }

            // const { track } = await player.play(channel, query, {
            //     nodeOptions: {
            //         // nodeOptions are the options for guild node (aka your queue in simple word)
            //         metadata: interaction // we can access this metadata object using queue.metadata later on
            //     }
            // });

            // console.log(track);

            // return interaction.followUp(`**${track.title}** enqueued!`);
        } catch (err) {
            // let's return error if something failed
            Bot.logger.error(err);
            return interaction.followUp(`Something went wrong: ${err}`);
        }
    }
}

module.exports = Play;

