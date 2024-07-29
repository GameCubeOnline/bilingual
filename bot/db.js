
require('dotenv').config({ 
    path: require('find-config')('settings.ini') 
});
  
const crypto = require('crypto');
const pgp = require('pg-promise')(/* options */)

var db = (function(){
    const USER = process.env.DATABASE_USER || "bilingual";
    const PASSWORD = process.env.DATABASE_PASSWORD || "development_password";
    const HOST = process.env.DATABASE_HOST || "127.0.0.1";
    const PORT = process.env.DATABASE_PORT || "5432";
    const NAME = process.env.DATABASE_NAME || "bilingual";
    return pgp(`postgres://${USER}:${PASSWORD}@${HOST}:${PORT}/${NAME}`);
})();



function hash(text){
    return crypto.createHash('sha256').update(text).digest('hex');
}

async function findGuild(options){
    let op = options || {};
    let result = await db.any(`
        SELECT id, data
        FROM bot_guild
        WHERE hashed_reference = $1 
        LIMIT 1
    `, [ hash(op.reference) ]);

    if (result.length <= 0) {
        return null;
    }

    const data = result[0].data;

    // Return data directly if it's already an object
    return data;
}

async function saveGuild(options){
    let op = options || {};
    await db.none(`
        INSERT INTO bot_guild (hashed_reference, data)
            VALUES ($1, $2) 
        ON CONFLICT (hashed_reference) 
            DO UPDATE SET data = $2
    `, [
        hash(op.reference),
        JSON.stringify(op.data),
    ]);
}

async function findChannel(options){
    let op = options || {};
    let result = await db.any(`
        SELECT id, data          
        FROM bot_channel
        WHERE hashed_reference = $1 
        LIMIT 1
    `, [ hash(op.reference) ]);

    if(result.length <= 0){
        return null;
    }

    // Assuming `data` is already an object
    return result[0].data;
}

async function saveChannel(options){
    let op = options || {};
    await db.none(`
        INSERT INTO bot_channel (hashed_reference, data)
            VALUES ($1, $2) 
        ON CONFLICT (hashed_reference) 
            DO UPDATE SET data = $2
    `, [
        hash(op.reference),
        JSON.stringify(op.data),
    ]);
}

async function findMessage(options){
    let op = options || {};
    let result = await db.any(`
        SELECT id, data          
        FROM bot_message
        WHERE hashed_reference = $1 
        LIMIT 1
    `, [ 
        hash(op.reference), 
    ]);
    if(result.length <= 0){
        return null;
    }
    return JSON.parse(result[0].data || "{}");
}

async function saveMessage(options){
    let op = options || {};
    await db.none(`
        INSERT INTO bot_message (hashed_reference, data)
            VALUES ($1, $2) 
        ON CONFLICT (hashed_reference) 
            DO UPDATE SET data = $2
    `, [
        hash(op.reference),
        JSON.stringify(op.data),
    ]);
}

module.exports = {
    findGuild,
    saveGuild,
    findChannel,
    saveChannel,
    findMessage,
    saveMessage,
}
  
  
  
