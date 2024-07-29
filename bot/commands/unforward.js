const { ChatBot } = require("../bot.js");
const { AutocodeBridge } = require("../bridges.js");

module.exports = {
	meta: {
        "name": "unforward",
        "description": "Stop forward messages to specific channel",
        "options": [
            {
                "type": 7,
                "name": "channel",
                "description": "Text channel",
                "required": true
            }
        ],
    },
	async execute(client, e) {
        let options = e.options;
        let forwardChannel = options.getChannel("channel");
        if(!forwardChannel){
            return;
        }

        let forwardChannelId = forwardChannel.id;
        let channelId = e.channelId;

        let chatBot = new ChatBot(channelId, {
            guildId: e.guildId,
            delegate: new AutocodeBridge(client),
        });

        let chatData = await chatBot.getChannelData();
        chatData.removeForwardChannelId(forwardChannelId);

        await Promise.all([
            chatData.save(),
            (async function(){
                let text = chatBot.getLocalizedMessage(`Okay! stop forward messages in this channel to <#${channelId}>`);
                await e.reply(text);
            })(),
        ]);
        return;
	},
};

