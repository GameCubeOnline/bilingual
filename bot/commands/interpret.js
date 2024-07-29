const { ChatBot } = require("../bot.js");
const { AutocodeBridge } = require("../bridges.js");

module.exports = {
	meta: {
        "name": "interpret",
        "description": "Interpret messages in this channel to specific languages",
        "options": [
            {
                "type": 3,
                "name": "iso639_or_sample_text",
                "description": "Sample text of intend langauge or iso639 (e.g. en, fr)",
                "required": true
            }
        ]
    },
	async execute(client, e) {
        let chatBot = new ChatBot(e.channelId, {
            guildId: e.guildId,
            delegate: new AutocodeBridge(client),
        });

        let options = e.options;
        let sampleTextOrLanguage = options.getString("iso639_or_sample_text");
        
        let language = await chatBot.getLanguageFromSampleText(sampleTextOrLanguage);
        if(!language){
            let text = await chatBot.getLocalizedMessage("I don't recognize that language");
            await e.reply(text);
            return; 
        } 
        
        let chatData = await chatBot.getChannelData();
        chatData.addLanguage(language.value);
        
        await Promise.all([
            chatData.save(),
            chatBot.sendSupportDirectMessage({ 
                user: e.member.user 
            }),
            (async function(){
                let text = await chatBot.getLocalizedMessage(`Okay! start interpret to "${language.label}"`, {language: "en"});
                await e.reply(text);
            })(),
        ]);
        return;
	},
};

