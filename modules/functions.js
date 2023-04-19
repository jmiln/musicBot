const { WebhookClient, ApplicationCommandOptionType, PermissionsBitField } = require("discord.js");
const {promisify, inspect} = require("util");     // eslint-disable-line no-unused-vars
const readdir = promisify(require("fs").readdir);
// const DEBUG = true;
const DEBUG = false;

module.exports = (Bot, client) => {
    Bot.constants = {
        // Zero width space
        zws: "\u200B",

        // Some normal color codes
        colors: {
            black:     0,
            blue:      255,
            lightblue: 22015,
            green:     65280,
            red:       16711680,
            brightred: 14685204,
            white:     16777215,
            yellow:    16776960,
        },
    };

    // Default formatting for current US/Pacific time
    Bot.myTime = () => {
        return Intl.DateTimeFormat("en", {day: "numeric", month: "numeric", year: "numeric", hour: "numeric", minute: "numeric", timeZone: "America/Los_Angeles"}).format(new Date());
    };

    client.unloadSlash = commandName => {
        if (client.slashcmds.has(commandName)) {
            const command = client.slashcmds.get(commandName);
            client.slashcmds.delete(command);
            delete require.cache[require.resolve(`../slash/${command.commandData.name}.js`)];
        }
        return;
    };
    client.loadSlash = commandName => {
        try {
            const cmd = new (require(`../slash/${commandName}`))(Bot);
            if (!cmd.commandData.enabled) {
                return commandName + " is not enabled";
            }
            client.slashcmds.set(cmd.commandData.name, cmd);
            return false;
        } catch (e) {
            console.log("ERROR:");
            console.error(e);
            return `Unable to load command ${commandName}: ${e}`;
        }
    };
    client.reloadSlash = async (commandName) => {
        let response = client.unloadSlash(commandName);
        if (response) {
            return new Error(`Error Unloading: ${response}`);
        } else {
            response = client.loadSlash(commandName);
            if (response) {
                return new Error(`Error Loading: ${response}`);
            }
        }
        return commandName;
    };

    // Reloads all slash commads (even if they were not loaded before)
    // Will not remove a command if it's been loaded,
    // but will load a new command if it's been added
    client.reloadAllSlashCommands = async () => {
        [...client.slashcmds.keys()].forEach(c => {
            client.unloadSlash(c);
        });
        const cmdFiles = await readdir("./slash/");
        const coms = [], errArr = [];
        cmdFiles.forEach(async (f) => {
            try {
                const cmd = f.split(".")[0];
                if (f.split(".").slice(-1)[0] !== "js") {
                    errArr.push(f);
                } else {
                    const res = client.loadSlash(cmd);
                    if (!res) {
                        coms.push(cmd);
                    } else {
                        errArr.push(f);
                    }
                }
            } catch (e) {
                Bot.logger.error("Error: " + e);
                errArr.push(f);
            }
        });
        return {
            succArr: coms,
            errArr: errArr
        };
    };

    // Reload the events files (message, guildCreate, etc)
    client.reloadAllEvents = async () => {
        const ev = [], errEv = [];

        const evtFiles = await readdir("./events/");
        evtFiles.forEach(file => {
            try {
                const eventName = file.split(".")[0];
                client.removeAllListeners(eventName);
                const event = require(`../events/${file}`);
                if (["error", "ready", "interactionCreate", "messageCreate", "guildMemberAdd", "guildMemberRemove"].includes(eventName)) {
                    client.on(eventName, event.bind(null, Bot, client));
                } else {
                    client.on(eventName, event.bind(null, Bot));
                }
                delete require.cache[require.resolve(`../events/${file}`)];
                ev.push(eventName);
            } catch (e) {
                Bot.logger.error("In Event reload: " + e);
                errEv.push(file);
            }
        });
        return {
            succArr: ev,
            errArr: errEv
        };
    };

    // Reload the functions (this) file
    client.reloadFunctions = async () => {
        try {
            delete require.cache[require.resolve("../modules/functions.js")];
            require("../modules/functions.js")(Bot, client);
            delete require.cache[require.resolve("../modules/Logger.js")];
            delete Bot.logger;
            const Logger = require("../modules/Logger.js");
            Bot.logger = new Logger(Bot, client);
        } catch (err) {
            return {err: err.stack};
        }
    };

    /* MISCELANEOUS NON-CRITICAL FUNCTIONS */

    // `await wait(1000);` to "pause" for 1 second.
    Bot.wait = promisify(setTimeout);

    // Get the current guild count
    Bot.guildCount = async () => {
        let guilds = 0;
        if (client.shard) {
            await client.shard.fetchClientValues("guilds.cache.size")
                .then(results => {
                    guilds =  results.reduce((prev, val) => prev + val, 0);
                })
                .catch(console.error);
            return guilds;
        } else {
            return client.guilds.cache.size;
        }
    };

    /* isUserID
     * Check if a string of numbers is a valid user.
     */
    Bot.isUserID = (numStr) => {
        if (!numStr || !numStr.length) return false;
        const match = /(?:\\<@!?)?([0-9]{17,20})>?/gi.exec(numStr);
        return match ? true : false;
    };

    /* getUserID
     * Get a valid Discord id string from a given string.
     */
    Bot.getUserID = (numStr) => {
        if (!numStr || !numStr.length) return null;
        const match = /(?:\\<@!?)?([0-9]{17,20})>?/gi.exec(numStr);
        if (match) {
            return numStr.replace(/[^0-9]/g, "");
        }
        return null;
    };

    // Deploy commands
    Bot.deployCommands = async (force=false) => {
        const outLog = [];

        if (force) {
            console.log("Running deploy with force.");
            try {
                // Filter the slash commands to find guild only ones.
                // const guildCmds = client.slashcmds.filter(c => c.guildOnly).map(c => c.commandData);
                // await client.shard.broadcastEval(async (client, {guildId, guildComs}) => {
                //     const targetGuild = await client.guilds.cache.get(guildId);
                //     if (targetGuild) {
                //         for (const guildCom of guildComs) {
                //             await targetGuild.commands.set(guildCom.id, guildCom.com);
                //         }
                //     }
                // }, {context: {
                //     guildId: Bot.config.dev_server,
                //     guildComs: guildCmds,
                // }});

                const globalCmds = client.slashcmds.filter(c => !c.guildOnly);
                const globalCmdData = globalCmds?.map(c => c.commandData);
                await client.application?.commands.set(globalCmdData);
            } catch (err) {
                console.error("ERROR: " + err);
            }
        } else if (Bot.config.dev_server) {
            try {
                // Filter the slash commands to find guild only ones.
                const guildCmds = client.slashcmds.filter(c => c.guildOnly).map(c => c.commandData);

                // The currently deployed commands
                let currentGuildCommands = await client.shard.broadcastEval(async (client, {guildId}) => {
                    const targetGuild = await client.guilds.cache.get(guildId)?.commands.fetch();
                    if (targetGuild) {
                        return targetGuild;
                    }
                }, {context: {
                    guildId: Bot.config.dev_server
                }});
                if (currentGuildCommands?.length) currentGuildCommands = currentGuildCommands.filter(curr => !!curr)[0];
                const { newComs: newGuildComs, changedComs: changedGuildComs } = checkCmds(guildCmds, currentGuildCommands);

                // We'll use set but please keep in mind that `set` is overkill for a singular command.
                // Set the guild commands like this.

                if (newGuildComs?.length || changedGuildComs?.length) {
                    await client.shard.broadcastEval(async (client, {guildId, newGuildComs, changedGuildComs}) => {
                        const targetGuild = await client.guilds.cache.get(guildId);
                        if (targetGuild) {
                            for (const newGuildCom of newGuildComs) {
                                console.log(`Adding ${newGuildCom.name} to Guild commands`);
                                await targetGuild.commands.create(newGuildCom);
                            }
                            for (const diffGuildCom of changedGuildComs) {
                                console.log(`Updating ${diffGuildCom.com.name} in Guild commands`);
                                await targetGuild.commands.edit(diffGuildCom.id, diffGuildCom.com);
                            }
                        }
                    }, {context: {
                        guildId: Bot.config.dev_server,
                        newGuildComs: newGuildComs,
                        changedGuildComs: changedGuildComs
                    }});

                    // The new guild commands
                    outLog.push({
                        name: "**Added Guild**",
                        value: newGuildComs?.length ? newGuildComs.map(newCom => ` * ${newCom.name}`).join("\n") : "N/A"
                    });

                    // The edited guild commands
                    outLog.push({
                        name: "**Changed Guild**",
                        value: changedGuildComs?.length ? changedGuildComs.map(diffCom => ` * ${diffCom.com.name}`).join("\n") : "N/A"
                    });
                }


                if (Bot.config.enableGlobalCmds) {
                    // Then filter out global commands by inverting the filter
                    const globalCmds = client.slashcmds.filter(c => !c.guildOnly).map(c => c.commandData);
                    // Get the currently deployed global commands
                    const currentGlobalCommands = await client.application?.commands?.fetch();

                    const { newComs: newGlobalComs, changedComs: changedGlobalComs } = checkCmds(globalCmds, currentGlobalCommands);

                    // The new global commands
                    if (newGlobalComs.length) {
                        for (const newGlobalCom of newGlobalComs) {
                            console.log(`Adding ${newGlobalCom.name} to Global commands`);
                            await client.application?.commands.create(newGlobalCom);
                        }
                        outLog.push({
                            name: "**Added Global**",
                            value: newGlobalComs?.length ? newGlobalComs.map(newCom => ` * ${newCom.name}`).join("\n") : "N/A"
                        });
                    }

                    // The edited global commands
                    if (changedGlobalComs.length) {
                        for (const diffGlobalCom of changedGlobalComs) {
                            console.log(`Updating ${diffGlobalCom.com.name} in Global commands`);
                            await client.application?.commands.edit(diffGlobalCom.id, diffGlobalCom.com);
                        }
                        outLog.push({
                            name: "**Changed Global**",
                            value: changedGlobalComs?.length ? changedGlobalComs.map(diffCom => ` * ${diffCom.com.name}`).join("\n") : "N/A"
                        });
                    }
                }

                if (outLog?.length) {
                    console.log("Deployed Commands:");
                    console.log(outLog.map(log => `${log.name}:\n${log.value}`).join("\n\n"));
                }
                return outLog;
            } catch (err) {
                Bot.logger.error(inspect(err, {depth: 5}));
            }
        }
    };

    // Function to see if we have permission to see/ send messages in a given channel
    Bot.hasViewAndSend = async (channel, user) => {
        return (channel?.guild && channel.permissionsFor(user)?.has([PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])) || false;
    };
};



function checkCmds(newCmdList, oldCmdList) {
    const changedComs = [];
    const newComs = [];

    // Work through all the commands that are already deployed, and see which ones have changed
    newCmdList.forEach(cmd => {
        const thisCom = oldCmdList.find(c => c.name === cmd.name);
        let isDiff = false;

        // If there's no match, it definitely goes in
        if (!thisCom) {
            console.log("Need to add " + cmd.name);
            return newComs.push(cmd);
        } else {
            // Fill in various options info, just in case
            debugLog("\nChecking " + cmd.name);
            for (const ix in cmd.options) {
                if (!cmd.options[ix])                           cmd.options[ix]                          = {};
                if (!cmd.options[ix].required)                  cmd.options[ix].required                 = false;
                if (!cmd.options[ix].autocomplete)              cmd.options[ix].autocomplete             = undefined;
                if (!cmd.options[ix].choices)                   cmd.options[ix].choices                  = undefined;
                if (!cmd.options[ix].nameLocalizations)         cmd.options[ix].nameLocalizations        = undefined;
                if (!cmd.options[ix].nameLocalized)             cmd.options[ix].nameLocalized            = undefined;
                if (!cmd.options[ix].descriptionLocalizations)  cmd.options[ix].descriptionLocalizations = undefined;
                if (!cmd.options[ix].descriptionLocalized)      cmd.options[ix].descriptionLocalized     = undefined;
                if (!cmd.options[ix].channelTypes)              cmd.options[ix].channelTypes             = undefined;
                if (!cmd.options[ix].options?.length)           cmd.options[ix].options                  = undefined;

                if (!cmd.options[ix].minValue  && !isNaN(cmd.options[ix].minValue))  cmd.options[ix].minValue  = undefined;
                if (!cmd.options[ix].maxValue  && !isNaN(cmd.options[ix].maxValue))  cmd.options[ix].maxValue  = undefined;
                if (!cmd.options[ix].minLength && !isNaN(cmd.options[ix].minLength)) cmd.options[ix].minLength = undefined;
                if (!cmd.options[ix].maxLength && !isNaN(cmd.options[ix].maxLength)) cmd.options[ix].maxLength = undefined;

                debugLog("> checking " + cmd.options[ix]?.name);
                for (const opt of Object.keys(cmd.options[ix])) {
                    debugLog("  * Checking: " + opt);
                    if (opt === "choices") {
                        if (cmd.options[ix]?.choices?.length && thisCom.options[ix]?.choices?.length) {
                            // Make sure they both have some number of choices
                            if (cmd.options[ix]?.choices?.length !== thisCom.options[ix]?.choices?.length) {
                                // One of em is different than the other, so definitely needs an update
                                debugLog("ChoiceLen is different");
                                isDiff = true;
                            } else {
                                // If they have the same option count, make sure that the choices are the same inside
                                cmd.options[ix].choices.forEach((c, jx) => {
                                    const thisChoice = thisCom.options[ix].choices[jx];
                                    if (c.name !== thisChoice.name || c.value !== thisChoice.value) {
                                        // They have a different choice here, needs updating
                                        debugLog("Diff choices");
                                        debugLog(c, thisChoice);
                                        isDiff = true;
                                        return;
                                    }
                                });
                            }
                        } else {
                            // One or both have no choices
                            if (cmd.options[ix]?.choices?.length && thisCom.options[ix]?.choices?.length) {
                                // At least one of em has an entry, so it needs updating
                                debugLog("choiceLen2 is diff");
                                isDiff = true;
                            } else {
                                // Neither of em have any, so nothing to do here
                                continue;
                            }
                        }
                        if (isDiff) {
                            debugLog(`   [NEW] - ${cmd.options[ix] ? inspect(cmd.options[ix]?.choices) : null}\n   [OLD] - ${thisCom.options[ix] ? inspect(thisCom.options[ix]?.choices) : null}`);
                            break;
                        }
                    } else {
                        const newOpt = cmd.options[ix];
                        const thisOpt = thisCom.options[ix];
                        if (!thisOpt) {
                            debugLog("Missing opt for: newOpt");
                            isDiff = true;
                            break;
                        }
                        if (!newOpt) {
                            debugLog("Missing opt for: newOpt");
                            isDiff = true;
                            break;
                        }
                        if ((newOpt.required !== thisOpt.required               && (newOpt.required || thisOpt.required)) ||
                            (newOpt.name !== thisOpt.name                       && (newOpt.name || thisOpt.name)) ||
                            (newOpt.autocomplete !== thisOpt.autocomplete       && (newOpt.autocomplete || thisOpt.autocomplete)) ||
                            (newOpt.description !== thisOpt.description         && (newOpt.description || thisOpt.description)) ||
                            (newOpt.minValue !== thisOpt.minValue               && (!isNaN(newOpt?.minValue) || !isNaN(thisOpt?.minValue))) ||
                            (newOpt.maxValue !== thisOpt.maxValue               && (!isNaN(newOpt?.maxValue) || !isNaN(thisOpt?.maxValue))) ||
                            (newOpt.minLength !== thisOpt.minLength             && (!isNaN(newOpt?.minLength) || !isNaN(thisOpt?.minLength))) ||
                            (newOpt.maxLength !== thisOpt.maxLength             && (!isNaN(newOpt?.maxLength) || !isNaN(thisOpt?.maxLength))) ||
                            (newOpt.choices?.length !== thisOpt.choices?.length && (newOpt.choices || thisOpt.choices)) ||
                            (newOpt.options?.length !== thisOpt.options?.length && (newOpt.options || thisOpt.options))
                        ) {
                            isDiff = true;
                            debugLog(`   [NEW] - ${newOpt ? inspect(newOpt) : null}\n   [OLD] - ${thisOpt ? inspect(thisOpt) : null}`);
                            break;
                        }

                        if (thisOpt?.type === ApplicationCommandOptionType.Subcommand) {
                            for (const optIx in thisOpt.options) {
                                const thisSubOpt = thisOpt.options[optIx];
                                const newSubOpt  = newOpt.options[optIx];

                                if ((newSubOpt.required !== thisSubOpt.required               && (newSubOpt.required || thisSubOpt.required)) ||
                                    (newSubOpt.name !== thisSubOpt.name                       && (newSubOpt.name || thisSubOpt.name)) ||
                                    (newSubOpt.autocomplete !== thisSubOpt.autocomplete       && (newSubOpt.autocomplete || thisSubOpt.autocomplete)) ||
                                    (newSubOpt.description !== thisSubOpt.description         && (newSubOpt.description || thisSubOpt.description)) ||
                                    (newSubOpt.minValue !== thisSubOpt.minValue               && (!isNaN(newSubOpt?.minValue) || !isNaN(thisSubOpt?.minValue))) ||
                                    (newSubOpt.maxValue !== thisSubOpt.maxValue               && (!isNaN(newSubOpt?.maxValue) || !isNaN(thisSubOpt?.maxValue))) ||
                                    (newSubOpt.minLength !== thisSubOpt.minLength             && (!isNaN(newSubOpt?.minLength) || !isNaN(thisSubOpt?.minLength))) ||
                                    (newSubOpt.maxLength !== thisSubOpt.maxLength             && (!isNaN(newSubOpt?.maxLength) || !isNaN(thisSubOpt?.maxLength))) ||
                                    (newSubOpt.choices?.length !== thisSubOpt.choices?.length && (newSubOpt.choices || thisSubOpt.choices)) ||
                                    (newSubOpt.options?.length !== thisSubOpt.options?.length && (newSubOpt.options || thisSubOpt.options))
                                ) {
                                    isDiff = true;
                                    debugLog(`   [NEW] - ${newSubOpt ? inspect(newSubOpt) : null}\n   [OLD] - ${thisSubOpt ? inspect(thisSubOpt) : null}`);
                                    break;
                                }
                            }
                        }
                        if (thisOpt?.type === ApplicationCommandOptionType.SubcommandGroup) {
                            debugLog(` > SubcommandGroup: ${thisOpt.name}`);
                            for (const optIx in thisOpt.options) {
                                const thisSubOpt = thisOpt.options[optIx];
                                const newSubOpt  = newOpt.options[optIx];

                                if ((newSubOpt.required !== thisSubOpt.required               && (newSubOpt.required || thisSubOpt.required)) ||
                                    (newSubOpt.name !== thisSubOpt.name                       && (newSubOpt.name || thisSubOpt.name)) ||
                                    (newSubOpt.autocomplete !== thisSubOpt.autocomplete       && (newSubOpt.autocomplete || thisSubOpt.autocomplete)) ||
                                    (newSubOpt.description !== thisSubOpt.description         && (newSubOpt.description || thisSubOpt.description)) ||
                                    (newSubOpt.minValue !== thisSubOpt.minValue               && (!isNaN(newSubOpt?.minValue) || !isNaN(thisSubOpt?.minValue))) ||
                                    (newSubOpt.maxValue !== thisSubOpt.maxValue               && (!isNaN(newSubOpt?.maxValue) || !isNaN(thisSubOpt?.maxValue))) ||
                                    (newSubOpt.minLength !== thisSubOpt.minLength             && (!isNaN(newSubOpt?.minLength) || !isNaN(thisSubOpt?.minLength))) ||
                                    (newSubOpt.maxLength !== thisSubOpt.maxLength             && (!isNaN(newSubOpt?.maxLength) || !isNaN(thisSubOpt?.maxLength))) ||
                                    (newSubOpt.choices?.length !== thisSubOpt.choices?.length && (newSubOpt.choices || thisSubOpt.choices)) ||
                                    (newSubOpt.options?.length !== thisSubOpt.options?.length && (newSubOpt.options || thisSubOpt.options))
                                ) {
                                    isDiff = true;
                                    debugLog(`   [NEW] - ${newSubOpt ? inspect(newSubOpt) : null}\n   [OLD] - ${thisSubOpt ? inspect(thisSubOpt) : null}`);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            if (cmd?.description !== thisCom?.description) {
                isDiff = true;
                debugLog("Diff Desc");
            }
            if (cmd?.defaultPermission !== thisCom?.defaultPermission) {
                isDiff = true;
                debugLog("Diff perms");
            }
        }

        // If something has changed, stick it in there
        if (isDiff) {
            console.log("Need to update " + thisCom.name);
            changedComs.push({id: thisCom.id, com: cmd});
        }
    });
    return {changedComs, newComs};
}

function debugLog(...str) {
    if (!DEBUG) return;
    if (str.length === 1 && typeof str[0] === "string") {
        console.log(str[0]);
    } else {
        console.log(inspect(...str, {depth: 5}));
    }
}

// function arrayEquals(a, b) {
//     if (!a?.length || !b?.length) return false;
//     return Array.isArray(a) &&
//         Array.isArray(b) &&
//         a.length === b.length &&
//         a.every((val, index) => val === b[index]);
// }
