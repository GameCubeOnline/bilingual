
require('dotenv').config({ 
    path: require('find-config')('settings.ini') 
});

const { ChatBot } = require("./bot.js");
const { AutocodeBridge } = require("./bridges.js");
const { COMMANDS } = require('./cmds.js');

// Require the necessary discord.js classes
const { REST, Routes, Client, Collection, GatewayIntentBits } = require('discord.js');
const { accessSync } = require('fs');

async function onSelectMenuChannelLanguage(client, e){
    let chatBot = new ChatBot(e.channelId, {
        guildId: e.guildId,
        delegate: new AutocodeBridge(client),
    });

    await Promise.all([
        chatBot.onUserSelectChannelLanguages({
            values: e.values,
        }),
        chatBot.clearMessageComponents({
            message: e.message,
        }),
    ]);
    return;
}

async function onSelectMenuForwardChannel(client, e){

    let chatBot = new ChatBot(e.channelId, {
        guildId: e.guildId,
        delegate: new AutocodeBridge(client),
    });

    await Promise.all([
        chatBot.onUserSelectForwardChannels({
            values: e.values,
        }),
        chatBot.clearMessageComponents({
            message: e.message,
        }),
    ]);    
}

async function onSelectMenu(client, e){
    if(e.customId == "select_channel_language"){
        await onSelectMenuChannelLanguage(client, e);
        return;
    }

    if(e.customId == "select_forward_channel"){
        await onSelectMenuForwardChannel(client, e);
        return;
    }    
}

async function onButtonDismiss(client, e){
    
    let chatBot = new ChatBot(e.channelId, {
        guildId: e.guildId,
        delegate: new AutocodeBridge(client),
    });

    await Promise.all([
        chatBot.onUserDismiss(),
        chatBot.clearMessageComponents({
            message: e.message,
        })
    ]);
  
}
async function onButtonCommitConfirm(client, e){
    
    let chatBot = new ChatBot(e.channelId, {
        guildId: e.guildId,
        delegate: new AutocodeBridge(client),
    });

    await Promise.all([
        chatBot.onUserConfirm({
            customId: "commit_confirm",
        }),
        chatBot.clearMessageComponents({
            message: e.message,
        })
    ]);

}
async function onButtonStartConversation(client, e){
    
    let chatBot = new ChatBot(e.channelId, {
        guildId: e.guildId,
        delegate: new AutocodeBridge(client),
    });

    await Promise.all([
        chatBot.startConversation(""),
        chatBot.clearMessageComponents({
            message: e.message,
        })
    ]);
}

async function onButton(client, e){
    if(e.customId == "dismiss"){
        await onButtonDismiss(client, e);
        return;
    }

    if(e.customId == "commit_confirm"){
        await onButtonCommitConfirm(client, e);
        return;
    }    
    if(e.customId == "start_conversation"){
        await onButtonStartConversation(client, e);
        return;
    }    

}

async function onBotMention(client, e){

    let chatBot = new ChatBot(e.channelId, {
        guildId: e.guildId,
        delegate: new AutocodeBridge(client),
    });
    await Promise.all([
        chatBot.startConversation(e.content),
        chatBot.sendSupportDirectMessage({ 
            user: e.author 
        }),
    ]);

}

async function onCreateMessage(client, e){

    let chatBot = new ChatBot(e.channelId, {
        guildId: e.guildId,
        delegate: new AutocodeBridge(client),
    });

    // console.log(`G:${e.guildId} C:${e.channelId} > ${e.content}`);

    await chatBot.onMessage({
        id: e.id,
        content: e.content,
        embeds: Array.from(e.embeds.values()),
        attachments: Array.from(e.attachments.values()),   
        user: e.author,
    });    
}

function loadClientCommands(){
    let commands = new Collection();
    for (const command of COMMANDS) {
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('meta' in command && 'execute' in command) {
            commands.set(command.meta.name, command);
        } 
    }    
    return commands;
}

async function onChatInputCommand(client, e){
    const command = e.client.commands.get(e.commandName);
    if(command){
        await command.execute(client, e);
    }
}

(function (){

    // Create a new client instance
    const client = new Client({ 
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ] 
    });

    client.on("guildCreate", async function(guild){
        try {
            const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
            await rest.put(
                Routes.applicationGuildCommands(client.id, guild.id), { 
                    body: COMMANDS.map(function (command){
                        return command.meta
                    })
                }
            ); 
        }
        catch(error){
            console.error(error);
        }
    });

    client.on("interactionCreate", async function(e){
        if(e.isSelectMenu()){
            await onSelectMenu(client, e);
            return;
        }

        if(e.isButton()){
            await onButton(client, e);
            return;
        }
        
        if(e.isChatInputCommand()){
            await onChatInputCommand(client, e);
            return;
        }
    });

    client.on("messageCreate", async function(e){
        if (e.author.bot){
            return;
        }

        if (!e.content.includes("@here") && !e.content.includes("@everyone") && e.type != "REPLY") {
            if (e.mentions.has(client.user.id)) {
                await onBotMention(client, e);
                return;
            }    
        }

        await onCreateMessage(client, e);

    });

    client.on("ready", async function(e){
        try {
            const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
            await rest.put(
                Routes.applicationCommands(client.user.id), { 
                    body: COMMANDS.map(function (command){
                        return command.meta
                    })
                }
            ); 
        }
        catch(error){
            console.error(error);
        }

    });


    client.commands = loadClientCommands();

    // Login to Discord with your client's token
    client.login(process.env.BOT_TOKEN);

})();

