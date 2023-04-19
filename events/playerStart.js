module.exports = async (Bot, queue, track) => {
    queue.metadata.channel.send(`Started playing **${track.title}**!`);
};
