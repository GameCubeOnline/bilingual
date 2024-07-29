const { ChatBot } = require("../bot.js");
const { AutocodeBridge } = require("../bridges.js");

module.exports = {
	meta: {
        "name": "forward",
        "description": "Forward messages to specific channel and interpret using that channel settings",
        "options": [
            {
                "type": 7,
                "name": "channel",
                "description": "Text channel",
                "required": true
            }
        ]
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

        try {
            let otherBot = new ChatBot(forwardChannelId, {
                guildId: e.guildId,
                delegate: new AutocodeBridge(client),
            });
            await otherBot.sendLocalizedMessage(`Start forward message from <#${channelId}>`);
        }
        catch(error) {
            let text = await chatBot.getLocalizedMessage(`Sorry, I cannot forward message to <#${forwardChannelId}>`);
            await e.reply(text);
            return;  
        }
        
        let chatData = await chatBot.getChannelData();
        chatData.addForwardChannelId(forwardChannelId);
        
        await Promise.all([
            chatData.save(),
            chatBot.sendSupportDirectMessage({ 
                user: e.member.user 
            }),
            (async function(){
                let text = await chatBot.getLocalizedMessage(`Okay! forward messages in this channel to <#${forwardChannelId}>`);
                await e.reply(text);
            })(),
        ]);
        return;
	},
};

