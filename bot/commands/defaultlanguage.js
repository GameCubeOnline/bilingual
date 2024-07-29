const { ChatBot } = require("../bot.js");
const { AutocodeBridge } = require("../bridges.js");

module.exports = {
	meta: {
        "name": "defaultlanguage",
        "description": "Get or set default language",
        "options": [
            {
                "type": 3,
                "name": "iso639_or_sample_text",
                "description": "Sample text of intend langauge or iso639 (e.g. en, fr)"
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
        if(!sampleTextOrLanguage){
            // getter
            let language = await chatBot.getGuildDefaultLanguage();
            let text = await chatBot.getLocalizedMessage(`Default language: ${language}`, {language: "en"});
            await e.reply(text);
            return;
        }
    

        // setter
        let language = await chatBot.getLanguageFromSampleText(sampleTextOrLanguage);
        if(!language){
            let text = await chatBot.getLocalizedMessage("I don't recognize that language");
            await e.reply(text);
            return; 
        } 

        await Promise.all([
            chatBot.setGuildDefaultLanguage(language.value),
            (async function(){
                let text = await chatBot.getLocalizedMessage(`Okay! set default language to ${language.label}`, {language: "en"});
                await e.reply(text);
            })(),
        ]);
        return;
	},
};

