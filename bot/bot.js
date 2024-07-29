const languages = require("./languages.js");
const settings = require("./settings.js");
const db = require("./db.js");

const STATE_IDLE = 1;
const MAX_COMPONENT_OPTIONS = 25;
const MAX_EMBEDS_SIZE = 2000;

const LANGUAGES = settings.LANGUAGES;
const SUPPORT_MESSAGE = settings.SUPPORT_MESSAGE;
const SUPPORT_MESSAGE_VERSION = settings.SUPPORT_MESSAGE_VERSION;
const WEBHOOK_NAME = settings.WEBHOOK_NAME;


class GuildData {

    constructor(guildId) {
        this.guildId = guildId;
        this.supportMessageVersion = null;
        this.defaultLangauge = null;
    }

    getData() {
        return {
            sm: this.supportMessageVersion,
            dl: this.defaultLangauge,
        }
    }

    setData(data) {
        let op = data || {};
        this.supportMessageVersion = parseInt(op.sm || 0, 10);
        this.defaultLangauge = op.dl || null;
    }

    async save() {
        await db.saveGuild({
            reference: this.guildId,
            data: this.getData(),
        });
    }

    async restore() {
        let data = await db.findGuild({
            reference: this.guildId,
        })
        this.setData(data || {});
    }

}

class ChannelData {
    constructor(channelId) {
        this.channelId = channelId;
        this.state = STATE_IDLE;
        this.chatLanguage = null;
        this.languages = [];
        this.forwardChannelIds = [];
    }

    stop() {
        this.languages = [];
        this.forwardChannelIds = [];
    }

    canStop() {
        if (this.languages && this.languages.length > 0) {
            return true;
        }
        if (this.forwardChannelIds && this.forwardChannelIds.length > 0) {
            return true;
        }
        return false;
    }

    addLanguage(value) {
        if (this.languages.includes(value)) {
            return;
        }
        this.languages.push(value);
    }

    removeLanguage(value) {
        this.languages = this.languages.filter(function(x) {
            return x != value;
        });
    }

    addForwardChannelId(value) {
        if (this.forwardChannelIds.includes(value)) {
            return;
        }
        this.forwardChannelIds.push(value);
    }

    removeForwardChannelId(value) {
        this.forwardChannelIds = this.forwardChannelIds.filter(function(x) {
            return x != value;
        });
    }

    getData() {
        return {
            st: this.state,
            cl: this.chatLanguage,
            ls: this.languages,
            fc: this.forwardChannelIds,
        }
    }

    setData(data) {
        let op = data || {};
        this.state = parseInt(op.st || STATE_IDLE, 10);
        this.chatLanguage = op.cl || null;
        this.languages = op.ls || [];
        this.forwardChannelIds = op.fc || [];
    }

    copy() {
        let n = new ChannelData(this.channelId);
        n.setData(this.getData());
        return n;
    }

    async save(key) {
        // await setKeyValue({
        //  key: `channel_${key||"data"}:${this.channelId}`,
        //  value: this.getData(),
        //});
        await db.saveChannel({
            reference: `${key||"data"}:${this.channelId}`,
            data: this.getData(),
        });
    }

    async restore(key) {
        // let data = await getKeyValue({
        //  key: `channel_${key||"data"}:${this.channelId}`,
        //  defaultValue: null,
        //});

        let data = await db.findChannel({
            reference: `${key||"data"}:${this.channelId}`,
        });
        this.setData(data || {});
    }

}

const CHANNEL_PATTERN = /\<\#(?<tag>[0-9]+)\>/ig

function listChannelIdsFromText(text) {
    let ms = [...text.matchAll(CHANNEL_PATTERN)];
    if (ms == null) {
        return [];
    }
    return ms.map(function(m) {
        return m.groups['tag'];
    });
}

const SYMBOLS_PATTERN = /[0-9\.\!\@\#\$\%\^\&\*\(\)\<\>]/ig;

function removeSymbolFromText(text) {
    return text.replace(SYMBOLS_PATTERN, " ").replace(/\s+/, " ").trim();
}


function splitLargeEmbeds(data, callback) {
    let content = data.content || "";
    let embeds = data.embeds || [];
    let totalChunkSize = content.length;

    let chunks = [];
    let result = [];
    for (let i = 0, totalEmbeds = embeds.length; i < totalEmbeds; i++) {
        let embed = embeds[i];
        let description = embed.description || "";
        let chunkSize = description.length;

        if (totalChunkSize > 0 && totalChunkSize + chunkSize > MAX_EMBEDS_SIZE) {
            result.push(callback({
                content: content,
                embeds: chunks,
            }));

            content = "";
            chunks = [];
            totalChunkSize = 0;
        }

        chunks.push(embed);
        totalChunkSize += chunkSize;
    }

    if (totalChunkSize > 0 || chunks.length > 0) {
        result.push(callback({
            content: content,
            embeds: chunks,
        }));
    }

    return result;
}



function convertAttachmentsToEmbeds(attachments) {
    if (!attachments) {
        return [];
    }
    return attachments.map(function(a) {

        let embed = {};
        embed.type = "rich";
        if(a.description) {
            embed.description = a.description;
        }
        if (a.url) {
            embed.url = a.url;
        }

        let contentType = a.contentType || "";
        if (contentType.includes("image")) {
            embed.image = {};
            if (a.url) {
                embed.image.url = a.url;
            }
            if (a.width) {
                embed.image.width = a.width;
            }
            if (a.height) {
                embed.image.height = a.height;
            }
            if (a.proxy_url) {
                embed.image.proxy_url = a.proxy_url;
            }
        } 
        else if (contentType.includes("video")) {
            embed.video = {};
            if (a.url) {
                embed.video.url = a.url;
            }
            if (a.width) {
                embed.video.width = a.width;
            }
            if (a.height) {
                embed.video.height = a.height;
            }
            if (a.proxy_url) {
                embed.video.proxy_url = a.proxy_url;
            }
        } 
        else if (a.name) {
            embed.title = a.name;
        }
        return embed;
    });
}

class ChatBot {
    constructor(threadId, options) {
        this.threadId = threadId;

        let op = options || {};
        this.chatData = null;
        this.guildData = null;
        this.guildId = op.guildId;
        this.delegate = op.delegate || null;
    }

    async getChannelData() {
        if (this.chatData == null) {
            let n = new ChannelData(this.threadId);
            await n.restore();
            this.chatData = n;
        }
        return this.chatData;
    }

    async getGuildData() {
        if (this.guildData == null) {
            let n = new GuildData(this.guildId);
            await n.restore();
            this.guildData = n;
        }
        return this.guildData;
    }

    getUserAvatarUrl(user) {
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    }

    async findOrCreateChannelWebhook(threadId) {
        let webhooks = await this.delegate.webhooks['@0.1.0'].list({
            channel_id: threadId
        });

        if (webhooks && webhooks.length > 0) {
            for (let i = webhooks.length - 1; i >= 0; i--) {
                let w = webhooks[i];
                if (WEBHOOK_NAME) {
                    if (w.name != WEBHOOK_NAME) {
                        continue;
                    }
                }
                return w;
            }
        }

        let webhook = await this.delegate.webhooks['@0.1.0'].create({
            channel_id: threadId,
            name: WEBHOOK_NAME,
        });
        return webhook;

    }

    async sendLazyTextMessage(threadId, options) {
        let op = options || {};

        let data = {
            channel_id: threadId,
            content: options.content || "",
            embeds: options.embeds || [],
            components: options.components || [],
        };

        let textStore = op.textStore;
        if (textStore) {
            data = await textStore.compile(data);
        }

        await this.delegate.channels['@0.3.1'].messages.create(data);
    }


    async confirmStopTranslateChannel(options) {
        let op = options || {};

        let chatData = await this.getChannelData();
        let confirmData = chatData.copy();
        confirmData.languages = [];
        confirmData.state = STATE_IDLE;

        let textStore = new languages.LazyTextStore({
            "from": "en",
            "to": chatData.chatLanguage,
        });
        await Promise.all([
            confirmData.save("commit_confirm"),
            this.sendLazyTextMessage(this.threadId, {
                textStore: textStore,
                content: textStore.get(op.question || "Would you like me to stop translate this channel?"),
                components: [{
                    type: 1,
                    components: [{
                            type: 2,
                            style: 4,
                            label: textStore.get("Yes, stop translate"),
                            custom_id: "commit_confirm",
                            disabled: false,
                            emoji: {
                                id: null,
                                name: `🛑`
                            },
                        },
                        {
                            type: 2,
                            style: 2,
                            label: textStore.get("No"),
                            custom_id: "start_conversation",
                            disabled: false,
                        },
                    ]
                }],
            }),
        ])
    }

    async confirmUseUnlistLanguage(options) {
        let op = options || {};


        let chatData = await this.getChannelData();
        let confirmData = chatData.copy();
        confirmData.languages.push(op.language);
        confirmData.state = STATE_IDLE;

        let textStore = new languages.LazyTextStore({
            "from": "en",
            "to": chatData.chatLanguage,
        });

        await Promise.all([
            confirmData.save("commit_confirm"),
            this.sendLazyTextMessage(this.threadId, {
                textStore: textStore,
                content: textStore.get(op.question || "Would you like me to be your interpreter here?"),
                components: [{
                    type: 1,
                    components: [{
                            type: 2,
                            style: 1,
                            label: textStore.get("Yes, translate everything else into this language"),
                            custom_id: "commit_confirm",
                            disabled: false,
                        },
                        {
                            type: 2,
                            style: 2,
                            label: textStore.get("No"),
                            custom_id: "start_conversation",
                            disabled: false,
                        },
                    ]
                }],
            }),
        ])
    }

    async confirmStopForwardToChannels(channels, options) {
        let op = options || {};
        let excludeChannelIds = channels.map(function(c) {
            return c.id;
        })


        let chatData = await this.getChannelData();
        let confirmData = chatData.copy();
        confirmData.forwardChannelIds = chatData.forwardChannelIds.filter(function(c) {
            return !excludeChannelIds.includes(c);
        });
        confirmData.state = STATE_IDLE;

        let textStore = new languages.LazyTextStore({
            "from": "en",
            "to": chatData.chatLanguage,
        });

        let channelNames = channels.map(function(c) {
            return `<#${c.id}>`;
        }).join(", ");

        await Promise.all([
            confirmData.save("commit_confirm"),
            this.sendLazyTextMessage(this.threadId, {
                textStore: textStore,
                content: textStore.get(op.question || `Would you like to stop forward messages to ${channelNames}?`),
                components: [{
                    type: 1,
                    components: [{
                            type: 2,
                            style: 4,
                            label: textStore.get("Yes, stop forward"),
                            custom_id: "commit_confirm",
                            disabled: false,
                            emoji: {
                                id: null,
                                name: `🛑`
                            },
                        },
                        {
                            type: 2,
                            style: 2,
                            label: textStore.get("No"),
                            custom_id: "start_conversation",
                            disabled: false,
                        },
                    ]
                }],
            }),
        ])
    }

    async confirmForwardToChannels(channels, options) {
        let op = options || {};

        let addingChannelIds = channels.map(function(c) {
            return c.id;
        })

        let chatData = await this.getChannelData();
        let confirmData = chatData.copy();
        confirmData.forwardChannelIds = chatData.forwardChannelIds.concat(addingChannelIds);
        confirmData.state = STATE_IDLE;

        let textStore = new languages.LazyTextStore({
            "from": "en",
            "to": chatData.chatLanguage,
        });

        let channelNames = channels.map(function(c) {
            return `<#${c.id}>`;
        }).join(",");

        await Promise.all([
            confirmData.save("commit_confirm"),
            this.sendLazyTextMessage(this.threadId, {
                textStore: textStore,
                content: textStore.get(op.question || `Would you like to forward messages to ${channelNames}?`),
                components: [{
                    type: 1,
                    components: [{
                            type: 2,
                            style: 3,
                            label: textStore.get("Yes, confirm forward"),
                            custom_id: "commit_confirm",
                            disabled: false,
                            emoji: {
                                id: null,
                                name: `⏩`
                            },
                        },
                        {
                            type: 2,
                            style: 2,
                            label: textStore.get("No"),
                            custom_id: "start_conversation",
                            disabled: false,
                        },
                    ]
                }],
            }),
        ])
    }

    async showForwardChannelsMenu(options) {
        let op = options || {};
        let channels = await this.delegate.guilds['@0.2.4'].channels.list({
            guild_id: this.guildId
        });

        let textChannels = channels.filter(function(channel) {
            return channel.type == 0;
        });

        let chatData = await this.getChannelData();
        let textStore = new languages.LazyTextStore({
            "from": "en",
            "to": chatData.chatLanguage,
        });

        if (textChannels.length > MAX_COMPONENT_OPTIONS) {
            // show only selected channel
            textChannels = textChannels.filter(function(channel) {
                return chatData.forwardChannelIds.includes(channel.id)
            });
        }

        if (textChannels.length > MAX_COMPONENT_OPTIONS) {
            textChannels = textChannels.slice(0, MAX_COMPONENT_OPTIONS);
        }
        await this.sendLazyTextMessage(this.threadId, {
            textStore: textStore,
            content: textStore.get(op.question || "Forward channels:"),
            components: [{
                    type: 1,
                    components: [{
                        type: 3,
                        required: false,
                        custom_id: "select_forward_channel",
                        label: textStore.get("Forward channel"),
                        placeholder: textStore.get("Choose channels to forward to"),
                        min_values: 0,
                        max_values: textChannels.length,
                        options: textChannels.map(function(n) {
                            return {
                                label: n.name,
                                value: n.id,
                                "default": chatData.forwardChannelIds.includes(n.id),
                            }
                        })
                    }]
                },
                {
                    type: 1,
                    components: [{
                        type: 2,
                        style: 2,
                        custom_id: "dismiss",
                        disabled: false,
                        label: textStore.get("Cancel"),
                    }]
                },
            ]
        });
    }

    async showTranslateLanguagesMenu(options) {
        let op = options || {};

        let chatData = await this.getChannelData();
        let textStore = new languages.LazyTextStore({
            "from": "en",
            "to": chatData.chatLanguage,
        });

        let extraLangs = chatData.languages.filter(function(n) {
            return LANGUAGES.findByValue(n) == null;
        });

        await this.sendLazyTextMessage(this.threadId, {
            textStore: textStore,
            content: textStore.get(op.question || "Which languages would you like me to be interpreter here?"),
            components: [{
                    type: 1,
                    components: [{
                        type: 3,
                        required: true,
                        custom_id: "select_channel_language",
                        label: textStore.get("Select languages"),
                        placeholder: textStore.get("Choose languages to interpret into"),
                        min_values: 0,
                        max_values: LANGUAGES.items.length,
                        options: LANGUAGES.items.map(function(n) {
                            return {
                                label: textStore.get(chatData.chatLanguage == "en" ? n.label : `${n.label} language`),
                                value: n.value,
                                emoji: n.emoji,
                                "default": chatData.languages.includes(n.value),
                            }
                        }).concat(extraLangs.map(function(n) {
                            return {
                                label: n,
                                value: n,
                                "default": chatData.languages.includes(n),
                            }
                        })),
                    }]
                },
                {
                    type: 1,
                    components: [{
                        type: 2,
                        style: 2,
                        custom_id: "dismiss",
                        disabled: false,
                        label: textStore.get("Cancel"),
                    }]
                },
            ]
        });
    }

    async getLocalizedMessage(message, options) {
        let chatData = await this.getChannelData();
        let op = options || {};
        let translated = await languages.getTranslation(message, {
            to: op.language || chatData.chatLanguage,
        });
        return translated.text;
    }


    async sendLocalizedMessage(message, options) {
        let op = options || {};
        let chatData = await this.getChannelData();
        let textStore = new languages.LazyTextStore({
            "from": "en",
            "to": op.language || chatData.chatLanguage,
        });

        await this.sendLazyTextMessage(this.threadId, {
            textStore: textStore,
            content: textStore.get(message),
        })
    }

    async sendLocalizedOkay() {
        await this.sendLocalizedMessage("Okay!");
    }

    async onUserSelectChannelLanguages(options) {
        let op = options || {};
        let values = op.values;

        let chatData = await this.getChannelData();
        chatData.languages = values;
        chatData.state = STATE_IDLE;

        await Promise.all([
            chatData.save(),
            this.sendLocalizedOkay(),
        ]);
    }

    async onUserSelectForwardChannels(options) {
        let op = options || {};
        let values = op.values;

        let chatData = await this.getChannelData();
        chatData.forwardChannelIds = values;
        chatData.state = STATE_IDLE;

        await Promise.all([
            chatData.save(),
            this.sendLocalizedOkay(),
        ]);
    }

    async onUserConfirm(options) {
        let op = options || {};
        let chatData = new ChannelData(this.threadId);
        await chatData.restore(op.customId || "commit_confirm");

        await Promise.all([
            chatData.save(),
            this.sendLocalizedOkay(),
        ]);
    }

    async onUserDismiss() {
        let chatData = await this.getChannelData();
        chatData.state = STATE_IDLE;

        await Promise.all([
            chatData.save(),
            this.sendLocalizedOkay(),
        ])
    }

    async setGuildDefaultLanguage(lang) {
        let guildData = await this.getGuildData();
        if (guildData.defaultLangauge == lang) {
            return;
        }
        guildData.defaultLangauge = lang;
        await guildData.save();
    }

    async getGuildDefaultLanguage() {
        let data = await this.getGuildData();
        let result = data.defaultLangauge || settings.DEFAULT_LANGUAGE;
        return result;
    }

    async sendSupportDirectMessage(options) {
        if (!SUPPORT_MESSAGE) {
            return;
        }

        let guildData = await this.getGuildData();
        let sentVersion = guildData.supportMessageVersion;
        if (sentVersion == SUPPORT_MESSAGE_VERSION) {
            return;
        }

        let op = options || {};
        let user = op.user;
        if (!user) {
            return;
        }


        let translatedText = await this.getLocalizedMessage(SUPPORT_MESSAGE);

        await this.delegate.users['@0.1.3'].dms.create({
            recipient_id: user.id,
            content: translatedText,
            tts: false,
        });

        guildData.supportMessageVersion = SUPPORT_MESSAGE_VERSION;
        await guildData.save();
    }

    async getLanguageFromSampleText(sampleText) {
        var selected = null;
        var query = sampleText.toLowerCase();
        LANGUAGES.items.forEach(function(lang) {
            if (lang.value.toLowerCase() == query) {
                selected = lang;
                return;
            }
            if (lang.label.toLowerCase() == query) {
                selected = lang;
                return;
            }
        });
        if (selected) {
            return selected;
        }

        try {
            let result = await languages.getTranslation("Hello world", {
                to: query
            });
            if (result) {
                return {
                    value: query,
                    label: query,
                }
            }
        } catch (error) {}


        try {
            let result2 = await languages.getTranslation(sampleText, {
                to: "en"
            });
            if (result2) {
                return {
                    value: result2.from,
                    label: result2.from,
                }
            }
        } catch (error) {}

        return null;

    }

    searchLanguage(text) {
        let result = null;
        let lowerText = ` ${text.toLowerCase()} `;
        LANGUAGES.items.forEach(function(lang) {
            if (lowerText.includes(lang.label.toLowerCase())) {
                result = lang.value;
                return;
            }
            if (lowerText.includes(` ${lang.value.toLowerCase()} `)) {
                result = lang.value;
                return;
            }
        });
        return result;
    }

    async listTextChannelsFromText(text, options) {
        let op = options || {};
        let guildId = op.guildId;
        let channelIds = listChannelIdsFromText(text);

        let channels = await this.delegate.guilds['@0.2.4'].channels.list({
            guild_id: guildId
        });

        return channels.filter(function(channel) {
            if (channel.type != 0) {
                return false;
            }
            return channelIds.includes(channel.id);
        });
    }

    async startConversation(content) {

        let noHashTagContent = removeSymbolFromText(content);
        let englishContent = await languages.getTranslation(noHashTagContent, {
            to: "en"
        });

        let chatData = await this.getChannelData();
        if (chatData.state == STATE_IDLE) {
            // chatData.state = STATE_WAIT_FOR_WHAT_TODO;
        }

        let foundLanguage = this.searchLanguage(englishContent.text);
        if (foundLanguage) {
            chatData.chatLanguage = foundLanguage;
        } else if (noHashTagContent.length > 0) {
            chatData.chatLanguage = englishContent.from;
            if (LANGUAGES.findByValue(englishContent.from) == null) {
                // unlist language
                if (!chatData.languages.includes(englishContent.from)) {
                    // unlist new language
                    await Promise.all([
                        chatData.save(),
                        this.confirmUseUnlistLanguage({
                            language: chatData.chatLanguage,
                        }),
                    ]);
                    return;
                }
            }
        }
        if (!chatData.chatLanguage) {
            chatData.chatLanguage = await this.getGuildDefaultLanguage();
        }

        let lowerText = englishContent.text.toLowerCase();
        let hasStopWord = lowerText.includes("stop") ||
            lowerText.includes("terminate") ||
            lowerText.includes("cancel");
        let hasForwardWord = lowerText.includes("forward") ||
            lowerText.includes("send");

        if (hasStopWord && hasForwardWord) {
            let mentionChannels = await this.listTextChannelsFromText(content, {
                guildId: this.guildId,
            });
            let mentionChannelsAlreadyForwarded = mentionChannels.filter(function(channel) {
                return chatData.forwardChannelIds.includes(channel.id);
            });

            if (mentionChannelsAlreadyForwarded.length > 0) {
                await Promise.all([
                    chatData.save(),
                    this.confirmStopForwardToChannels(mentionChannelsAlreadyForwarded),
                ]);
                return;
            }

            if (mentionChannels.length > 0) {
                await Promise.all([
                    chatData.save(),
                    this.showForwardChannelsMenu({
                        question: "Sorry, I don't quite understand.\nWould you like to change forward settings?"
                    })
                ]);
                return;
            }

            await Promise.all([
                chatData.save(),
                this.showForwardChannelsMenu({
                    question: "Here's forward settings"
                })
            ])
            return;
        } else if (hasForwardWord) {
            let mentionChannels = await this.listTextChannelsFromText(content, {
                guildId: this.guildId,
            });
            let mentionChannelsNotForwarded = mentionChannels.filter(function(channel) {
                return !chatData.forwardChannelIds.includes(channel.id);
            });
            if (mentionChannelsNotForwarded.length > 0) {
                await Promise.all([
                    chatData.save(),
                    this.confirmForwardToChannels(mentionChannelsNotForwarded),
                ]);
                return;
            }
            if (mentionChannels.length > 0) {
                await Promise.all([
                    chatData.save(),
                    this.showForwardChannelsMenu({
                        question: "Sorry, I don't quite understand.\nWould you like to change forward settings?"
                    }),
                ])
                return;
            }
            await Promise.all([
                chatData.save(),
                this.showForwardChannelsMenu({
                    question: "Forward settings"
                })
            ])
            return;
        } else if (hasStopWord) {
            if (chatData.languages.length > 0) {
                await Promise.all([
                    chatData.save(),
                    this.confirmStopTranslateChannel({
                        question: "Would you like me to stop interpret here?",
                    }),
                ]);
                return;
            }
        }
        await Promise.all([
            chatData.save(),
            this.showTranslateLanguagesMenu({
                question: "How can I help?\nWould you like me to be interpreter here? Choose languages you are familiar with."
            })
        ]);
        return;
    }

    async onMessage(options) {
        let op = options || {};
        let chatData = await this.getChannelData();
        if (chatData.state != STATE_IDLE) {
            return;
        }

        await Promise.all([
            this.handleChannelTranslations({
                messageId: op.id,
                content: op.content,
                embeds: op.embeds,
                attachments: op.attachments,
                user: op.user,
            }),
            this.handleForwardTranslations({
                messageId: op.id,
                content: op.content,
                embeds: op.embeds,
                attachments: op.attachments,
                user: op.user,
            })
        ])
    }

    async handleChannelTranslations(options) {
        let chatData = await this.getChannelData();
        if (!chatData.languages) {
            return;
        }
        if (chatData.languages.length <= 0) {
            return;
        }
        let op = options;
        await this.sendTranslationsMessage({
            messageId: op.messageId,
            content: op.content,
            embeds: op.embeds,
            attachments: op.attachments,
            user: op.user,
        });
    }

    async handleForwardTranslations(options) {
        let chatData = await this.getChannelData();
        if (!chatData.forwardChannelIds) {
            return;
        }
        if (chatData.forwardChannelIds.length <= 0) {
            return;
        }

        let op = options;
        var me = this;
        await Promise.all(chatData.forwardChannelIds.map(async function(channelId) {
            let bot = new ChatBot(channelId, {
                guildId: me.guildId,
                delegate: me.delegate,
            });
            return await bot.mirrorTranslationsMessage({
                messageId: op.messageId,
                content: op.content,
                embeds: op.embeds,
                attachments: op.attachments,
                user: op.user,
            });
        }));
    }

    async getWebHook() {
        if (!settings.ALLOW_SEND_MESSAGE_USING_WEBHOOK) {
            return null;
        }

        var webhook = null;
        try {
            webhook = await this.findOrCreateChannelWebhook(this.threadId);
        } 
        catch (error) {
        }
        return webhook;
    }

    async listTranslations(text, options) {
        let op = options || {};
        let chatData = await this.getChannelData();

        var originalLanguage = null;
        var hasOriginalInResult = false;
        let langs = chatData.languages;
        let translations = await Promise.all(langs.map(async function(lang) {
            let result = await languages.getTranslation(text, {
                "to": lang,
            });

            originalLanguage = result.from;
            if (result.text == text) {
                hasOriginalInResult = true;
                return null;
            }
            if (result.from == lang) {
                hasOriginalInResult = true;
                return null;
            }
            if (!result.text) {
                return null;
            }
            return result;
        }));

        if (!op.excludeOriginal && hasOriginalInResult) {
            translations = [{
                from: originalLanguage,
                to: originalLanguage,
                text: text,
            }].concat(translations);
        }

        let nonBlanks = translations.filter(function(x) {
            return x && x.text;
        });
        return nonBlanks;
    }

    async executeWebHookWithLargeEmbeds(webhook, options) {
        let op = options || {};

        let user = op.user;
        let avatarURL = this.getUserAvatarUrl(user);
        var me = this;

        await Promise.all(splitLargeEmbeds(op, function(data) {
            return me.delegate.webhooks['@0.1.0'].execute({
                webhook_id: webhook.id,
                webhook_token: webhook.token,
                username: user.username,
                avatar_url: avatarURL,
                content: data.content,
                embeds: data.embeds,
            });
        }));
    }

    async clearMessageComponents(options) {
        let op = options || {};
        let message = op.message;
        if (!message) {
            return;
        }

        await this.delegate.channels['@0.3.1'].messages.update({
            channel_id: this.threadId,
            message_id: message.id,
            content: message.content,
            embeds: message.embeds,
        });
    }

    async sendTextMessageWithLargeEmbeds(channelId, options) {
        var op = options || {};
        var me = this;
        await Promise.all(splitLargeEmbeds(op, function(data) {
            return me.delegate.channels['@0.3.1'].messages.create({
                channel_id: channelId,
                content: data.content,
                embeds: data.embeds,
            });
        }));
    }

    async sendTranslationsMessage(options) {
        let op = options || {};
        let content = op.content;

        let [webhook, translations] = await Promise.all([
            this.getWebHook(),
            this.listTranslations(content, {
                excludeOriginal: true
            }),
        ]);

        if (translations.length <= 0) {
            return;
        }

        let user = op.user;
        let messageId = op.messageId;

        // try send message as user using webhook
        if (!op.attachments || op.attachments.length <= 0) {
            if (!op.embeds || op.embeds.length <= 0) {
                if (webhook != null) {
                    await this.executeWebHookWithLargeEmbeds(webhook, {
                        user: user,
                        content: content,
                        embeds: translations.map(function(t) {
                            return {
                                description: t.text,
                            }
                        }).concat(convertAttachmentsToEmbeds(op.attachments))
                    });
                    await this.delegate.channels['@0.3.1'].messages.destroy({
                        message_id: messageId,
                        channel_id: this.threadId,
                    });
                    return;
                }
            }
        }


        // send message as bot
        await this.sendTextMessageWithLargeEmbeds(this.threadId, {
            content: "",
            embeds: translations.map(function(t) {
                return {
                    description: t.text,
                }
            })
        });
    }


    async mirrorTranslationsMessage(options) {
        let op = options || {};
        let content = op.content;

        let [webhook, translations] = await Promise.all([
            this.getWebHook(),
            this.listTranslations(content, {
                excludeOriginal: false
            }),
        ]);

        let user = op.user;

        if (translations.length > 0) {
            content = translations[0].text;
            translations.shift();
        }

        // try send message as a user using webhook
        if (!op.embeds || op.embeds.length <= 0) {
            if (webhook != null) {
                await this.executeWebHookWithLargeEmbeds(webhook, {
                    user: user,
                    content: content,
                    embeds: translations.map(function(t) {
                        return {
                            description: t.text,
                        }
                    }).concat(convertAttachmentsToEmbeds(op.attachments))
                });
                return;
            }
        }

        // send message as bot
        await this.sendTextMessageWithLargeEmbeds(this.threadId, {
            content: "",
            embeds: [{
                author: {
                    name: user.username,
                    icon_url: this.getUserAvatarUrl(user),
                },
                description: content,
            }].concat(translations.map(function(t) {
                return {
                    description: t.text,
                }
            }).concat(convertAttachmentsToEmbeds(op.attachments)))
        });
    }
}



module.exports = {
    ChatBot,
}