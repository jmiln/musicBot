const Command = require("../base/slashCommand");
const { ApplicationCommandOptionType } = require("discord.js");

class ReloadData extends Command {
    constructor(Bot) {
        super(Bot, {
            name: "reloaddata",
            enabled: true,
            guildOnly: true,
            permLevel: 10,
            options: [
                {
                    name: "target",
                    description: "What to reload",
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: [{ name: "Deploy Commands", value: "Deploy" }],
                },
            ],
        });
    }

    async run(Bot, interaction) {
        // eslint-disable-line no-unused-vars
        const channelId = interaction.channel.id;
        const action = interaction.options.getString("target").toLowerCase();

        switch (action) {
            case "deploy": {
                const outLog = await Bot.deployCommands(true);
                return interaction.reply({
                    content: "Deploying Commands...",
                    embeds: [
                        {
                            title: "Deployed Commands",
                            description: outLog?.length ? null : "Nothing deployed",
                            fields: outLog?.length ? outLog : null,
                        },
                    ],
                    ephemeral: true,
                });
            }
            default:
                return super.error(interaction, "You can only choose `swapi, events, functions, languages, swlang, users, or data.`");
        }
    }

    thenRes(Bot, interaction, res, reloadType) {
        const errors = [];
        for (const r of res) {
            if (r?.err) errors.push(r.err);
        }
        const uniqueErrors = [...new Set(errors)];
        return interaction.reply({
            content: uniqueErrors.length ? `**ERROR**\n${Bot.codeBlock(uniqueErrors.join("\n"))}` : `> ${reloadType} reloaded!`,
        });
    }

    thenResFiles(Bot, interaction, res) {
        let errors = [];
        for (const r of res) {
            if (r.errArr?.length) errors.push(...r.errArr);
        }
        errors = [...new Set(errors)];
        const resOut = res.map((r) => `${r.succArr.length.toString().padStart(4)} | ${r.errArr.length}`);
        return interaction.reply({
            content: Bot.codeBlock(`Succ | Err\n${resOut.join("\n")}${errors.length ? `\n\nErrors in files:\n${errors.join("\n")}` : ""}`),
        });
    }
}

module.exports = ReloadData;
