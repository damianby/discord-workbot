
let client;
let reportChannel;

function initialize(inClient, channelId) {
	client = inClient;

	reportChannel = client.channels.cache.get(channelId);
}

module.exports = {
	initialize: initialize,
}