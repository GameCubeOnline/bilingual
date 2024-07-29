const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});



function getUserAvatarUrl(user){
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
}

/*
async function postMessageAsUser(threadId, options){
  
  let op = options || {};
  let user = op.user;  
  
  let webhook = await findOrCreateChannelWebhook(threadId);
  return await lib.discord.webhooks['@0.1.0'].execute({
    webhook_id: webhook.id,
    webhook_token: webhook.token,
    content: op.content,
    username: user.username,
    avatar_url: getUserAvatarUrl(user),
    embeds: op.embeds || [],
    tts: op.tts || false,
  });  
}
*/

module.exports = {
  getUserAvatarUrl,
  // postMessageAsUser,
}


