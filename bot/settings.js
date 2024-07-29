const models = require("./models.js");


module.exports = {
  DEFAULT_LANGUAGE: 'en',
  SUPPORT_MESSAGE: `
Thank you for using :Bilingual:.

If you need help, here's our dev server:
https://discord.gg/wNqpW28eES`,
  SUPPORT_MESSAGE_VERSION: 3,
  ALLOW_SEND_MESSAGE_USING_WEBHOOK: true,
  WEBHOOK_NAME: "Bilingual",
  LANGUAGES: new models.ItemList({
    title: "language",
    items: [
      {
        "label": "Arabic",
        "value": "ar",
        "emoji": {
          "name": "🇦🇪",
          "id": null,
        }
      },
      {
        "label": "Bengali",
        "value": "bn",
        "emoji": {
          "name": "🇧🇩",
          "id": null,
        }
      },
      {
        "label": "Burmese",
        "value": "my",
        "emoji": {
          "name": "🇲🇲",
          "id": null,
        }
      },
      {
        "label": "Chinese (Simplified)",
        "value": "zh-CN",
        "emoji": {
          "name": "🇨🇳",
          "id": null,
        }
      },
      {
        "label": "Chinese (Traditional)",
        "value": "zh-TW",
        "emoji": {
          "name": "🇹🇼",
          "id": null,
        }
      },
      {
        "label": "English",
        "value": "en",
        "emoji": {
          "name": "🇬🇧",
          "id": null,
        }
      },
      {
        "label": "French",
        "value": "fr",
        "emoji": {
          "name": "🇫🇷",
          "id": null,
        }
      },
      {
        "label": "Hindi",
        "value": "hi",
        "emoji": {
          "name": "🇮🇳",
          "id": null,
        }
      },
      {
        "label": "Korean",
        "value": "ko",
        "emoji": {
          "name": "🇰🇷",
          "id": null,
        }
      },
      {
        "label": "Japanese",
        "value": "ja",
        "emoji": {
          "name": "🇯🇵",
          "id": null,
        }
      },
      {
        "label": "Indonesian",
        "value": "id",
        "emoji": {
          "name": "🇮🇩",
          "id": null,
        }
      },
      {
        "label": "Lao",
        "value": "lo",
        "emoji": {
          "name": "🇱🇦",
          "id": null,
        }
      },
      {
        "label": "Malay",
        "value": "ms",
        "emoji": {
          "name": "🇲🇾",
          "id": null,
        }
      },
      {
        "label": "Portuguese",
        "value": "pt",
        "emoji": {
          "name": "🇵🇹",
          "id": null,
        }
      },
      {
        "label": "Russian",
        "value": "ru",
        "emoji": {
          "name": "🇷🇺",
          "id": null,
        }
      },
      {
        "label": "Spanish",
        "value": "es",
        "emoji": {
          "name": "🇪🇸",
          "id": null,
        }
      },
      {
        "label": "Thai",
        "value": "th",
        "emoji": {
          "name": "🇹🇭",
          "id": null,
        }
      },
    ],
  }),
}

