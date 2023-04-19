const Command = require("../base/slashCommand");
const { useMasterPlayer } = require("discord-player");

const { buttonRow } = require("../modules/buttons.js");
// const buttons = require("../modules/buttons.js");

class NowPlaying extends Command {
    constructor(Bot) {
        super(Bot, {
            name: "nowplaying",
            description: "See what the current playing song is",
            guildOnly: false
        });
    }

    async run(Bot, interaction) {
        const channel = interaction.member.voice.channel;
        if (!channel) return interaction.reply("You are not connected to a voice channel!"); // make sure we have a voice channel

        const player = useMasterPlayer();
        if (!player) return super.error(interaction, "No player found.");

        // let's defer the interaction as things can take time to process
        await interaction.deferReply();

        const queue = player.nodes.get(interaction.guild.id);
        if (!queue || !queue.isPlaying()) {
            return super.error(interaction, "There isn't currently any music playing.");
        }


        if (!queue?.currentTrack) {
            return super.error(interaction, "There isn't anything playing currently.");
        }

        const progress = queue.node.createProgressBar();

        return interaction.editReply({
            embeds: [{
                title: "Currently Playing",
                description: `${progress}\n  \n**[${queue.currentTrack.title}](${queue.currentTrack.url})** by **${queue.currentTrack.author}**. \nThis track was requested by <@${queue.currentTrack.requestedBy?.id}>.`,
                thumbnail: {
                    url: queue.currentTrack?.thumbnail
                },
            }],
            components: [
                buttonRow
            ]
        });
    }
}

module.exports = NowPlaying;

