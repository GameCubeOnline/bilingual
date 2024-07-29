require('dotenv').config({ 
    path: require('find-config')('settings.ini') 
});

const { REST, Routes } = require('discord.js');
const { COMMANDS } = require('./cmds.js');

(async function (){
	try {
		const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId), { 
				body: COMMANDS.map(function (command){
					return command.meta;
				})
			}
		);
		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	}
	catch(error){
		console.error(error);
	}

})();
