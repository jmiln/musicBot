const Command = require("../base/slashCommand");
const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const { useMainPlayer } = require("discord-player");

class Play extends Command {
    constructor(Bot) {
        super(Bot, {
            name: "play",
            description: "Play a song or playlist",
            guildOnly: false,
            options: [
                {
                    name: "track",
                    type: ApplicationCommandOptionType.String,
                    description: "The song or playlist to try and play",
                    required: true,
                },
            ],
        });
    }

    async run(Bot, interaction) {
        // Redirect to the proper channel if set
        const gId = interaction.guild.id;
        const ignoreChannels = Bot.config.ignoreChannels;
        if (ignoreChannels?.[gId] && interaction.channel.id !== ignoreChannels[gId]) {
            return super.error(interaction, `Sorry, but this bot is limited to <#${ignoreChannels[gId]}> only.`);
        }

        const vChannel = interaction.member.voice.channel;
        if (!vChannel) return interaction.reply("You are not connected to a voice channel!"); // make sure we have a voice channel

        const query = interaction.options.getString("track"); // we need input/query to play

        const player = useMainPlayer();
        if (!player) return super.error(interaction, "No player found/ couldn't make one.");

        // Let's defer the interaction as things can take time to process
        await interaction.deferReply();


        const res = await player.search(query, {
            requestedBy: interaction.user,
        });

        if (!res.hasTracks()) {
            return super.error(interaction, `❌ | No Video/Song/Playlist was found when searching for: ${query}`);
        }

        if (res?.tracks?.[0]?.title) {
            await interaction.editReply({
                content: null,
                embeds: [
                    {
                        description: `🔎 | Found title: ${res.tracks[0].title}`,
                    },
                ],
            });
        } else {
            return super.error(interaction, `❌ | No Video/Song/Playlist was found when searching for: ${query}`);
        }

        try {
            const {track, searchResult} = await player.play(vChannel, res, {
                nodeOptions: {
                    metadata: interaction,
                    selfDeaf: true,
                    leaveOnEnd: false,
                    leaveOnStop: false,
                    leaveOnEmpty: true,
                    // leaveOnEmptyCooldown: 30_000, // 30 seconds
                },
                requestedBy: interaction.user,
                connectionOptions: {
                    deaf: true,
                }
            });

            // console.log(`[PLAY] ${track.title} requested by ${interaction.user.tag} (${interaction.user.id})`);

            const playEmbed = new EmbedBuilder()
                .setColor("Random")
                .setTitle(
                    `🎶 | New ${searchResult.hasPlaylist() ? "Playlist" : "Song"} added to queue. ${searchResult.hasPlaylist() ? `${searchResult.tracks.length} tracks added` : ""}`,
                )
                .setDescription(`[${track.title}](${track.url}) by **${track.author}**`)
                .setFields(
                    searchResult.hasPlaylist()
                    ? [{
                        name: "Playlist",
                        value: `**${searchResult.tracks.length} tracks** from the **[${searchResult.playlist?.title || "Unknown"}](${searchResult.playlist?.url || "Unknown"})**`
                    }]
                    : []
                );

            return await interaction.editReply({ content: null, embeds: [playEmbed] });
        } catch (err) {
            return super.error(interaction, `Something went wrong while trying to play ${query}:\n${err.message}`);
        }
    }
}

module.exports = Play;
