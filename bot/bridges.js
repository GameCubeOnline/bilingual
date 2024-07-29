
const { WebhookClient } = require('discord.js');

class AutocodeBridge {
    constructor(client) {
        this.client = client;
        this.guilds = {
            '@0.2.4': {
                channels: {
                    list: async function(op){
                        let guild = await client.guilds.fetch(op.guild_id);
                        return Array.from(guild.channels.cache.values());
                    },
                }
            }
        }
        this.webhooks = {
            '@0.1.0': {
                list: async function(op){
                    let channel = await client.channels.fetch(op.channel_id);
                    let webhooks = await channel.fetchWebhooks();
                    return Array.from(webhooks.values());
                },
                create: async function(op){
                    let channel = await client.channels.fetch(op.channel_id);
                    let webhook = await channel.createWebhook({
                        name: op.name,
                    });
                    return webhook;
                },
                execute: async function(op){
                    const webhook = new WebhookClient({
                        id: op.webhook_id,
                        token: op.webhook_token,
                    });

                    return await webhook.send({
                        content: op.content,
                        username: op.username,
                        avatarURL: op.avatar_url,
                        embeds: op.embeds,
                    });
                },
            }
        };
        this.channels = {
            '@0.3.1': {
                messages: {
                    create: async function(op){
                        let channel = await client.channels.fetch(op.channel_id);
                        await channel.send({
                            content: op.content,
                            embeds: op.embeds || [],
                            components: op.components || [],
                        })
                    },

                    update: async function(op){
                        let channel = await client.channels.fetch(op.channel_id);
                        let message = await channel.messages.fetch(op.message_id);
                        await message.edit({
                            content: op.content,
                            embeds: op.embeds || [],
                            components: op.components || [],
                        })
                    },
                    destroy: async function(op){
                        let channel = await client.channels.fetch(op.channel_id);
                        let message = await channel.messages.fetch(op.message_id);
                        await message.delete();
                    },
                },
            }
        };
        this.users = {
            '@0.1.3': {
                dms: {
                    create: async function(op){
                        let user = await client.users.fetch(op.recipient_id);
                        await user.send(op.content);
                    },
                }
            }
        };



    }
}

module.exports = {
    AutocodeBridge,
}