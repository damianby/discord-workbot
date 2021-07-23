/* eslint-disable no-prototype-builtins */
const log = require('./log')('discord-manager');

const db = require('./db');


const { parse } = require('discord-command-parser');

const moment = require('moment-timezone');
moment.locale('pl');
moment.tz.setDefault('Europe/Warsaw');
const https = require('https');


const manager = require('./manager');

// Import the discord.js module
const Discord = require('discord.js');

// Create an instance of a Discord client
const client = new Discord.Client({ intents: Discord.Intents.ALL });

let bIsReady = false;

const WORK_CHANNEL_NAME = 'workhours';


const GROUP = {
	EMPLOYEE: 'employee',
	WEEDLOVER: 'weedlover',
	ADMIN: 'admin',
};
Object.freeze(GROUP);


class CommandsManager {

	constructor() {
		this.Commands = {
			setgroup : {
				name: 'setGroup',
				func: setGroupMessage,
				desc: 'Pozwala ustawić grupę danemu użytkownikowi',
				params: [{ name: 'userId', required: true }, { name: 'groupName', required: true }],
				privileges: [GROUP.ADMIN],
			},
			removegroup : {
				name: 'removeGroup',
				func: removeGroupMessage,
				desc: 'Pozwala usunąć grupę danemu użytkownikowi',
				params: [{ name: 'userId', required: true }, { name: 'groupName', required: true }],
				privileges: [GROUP.ADMIN],
			},
			in : {
				name: 'in',
				func: inMessage,
				desc: 'Logowanie do systemu zliczania czasu',
				params: [],
				privileges: [GROUP.EMPLOYEE],
			},
			out : {
				name: 'out',
				func: outMessage,
				desc: 'Wylogowanie z systemu zliczania czasu',
				params: [],
				privileges: [GROUP.EMPLOYEE]
			},
			miałek: {
				name: 'miałek',
				func: mialekMessage,
				desc: 'Zaproszenie na miałek!',
				params: [{name: 'message', required: false}],
				privileges: [GROUP.WEEDLOVER]
			},
			refresh: {
				name: 'refresh',
				func: refreshMessage,
				desc: 'Odświeżenie bota, wyczyszczenie kanałow oraz aktualizacji nowych użytkowników',
				params: [],
				privileges: [GROUP.ADMIN]
			},
			komendy: {
				name: 'komendy',
				func: commandsMessage,
				desc: 'Wyświetla liste wszystkich komend',
				params: [],
				privileges: [GROUP.EMPLOYEE]
			},
			raport: {
				name: 'raport',
				func: reportsMessage,
				desc: 'Generuje odnośnik do raportu godzinowego',
				params: [],
				privileges: [GROUP.EMPLOYEE]
			},
			track: {
				name: 'track',
				func: trackMessage,
				desc: 'Śledzenie zmian w repozytorium',
				params: [{name: 'path', required: true}],
				privileges: [GROUP.ADMIN]
			},
			all: {
				name: 'all',
				func: allMessage,
				desc: 'Wysłanie prywatnej wiadomości do wszystkich członków serwera',
				params: [ {name: 'message', require: true}],
				privileges: [GROUP.ADMIN],
			}
		}

		for (const cmd in this.Commands) {
			if (this.Commands.hasOwnProperty(cmd)) {
				let command = this.Commands[cmd];
				command.numParamsRequired = 0
				for(let i = 0 ; i < command.params.length ; i++) {
					command.numParamsRequired += command.params[i].required ? 1 : 0;
				}
			}
		}
	}

	getList(privilegesGroup) {
		const outCommands = [];
		for (const cmd in this.Commands) {
			if (this.Commands.hasOwnProperty(cmd)) {
				const command = this.Commands[cmd];
				const intersection = privilegesGroup.filter(x => command.privileges.includes(x));

				if(intersection.length > 0) {
					outCommands.push(command);
				}
			}
		}
		return outCommands;
	}

	getCmd(commandName) {
		return this.Commands[commandName];
	}

	getUsage(command) {
		if(command) {

			let usageString = '/' + command.name;
			const params = command.params;
			for(let i = 0 ; i < params.length ; i++) {

				if(params[i].required) {
					usageString += ' (req)' + params[i].name;
				} else {
					usageString += ' ' + params[i].name
				}
			}
			return usageString;
		}
	}
	getDesc(command) {
		if(command) {
			return command.desc;
		}
	}

	async dispatch(message) {
			
		let parsed = parse(message, '/', { allowSpaceBeforeCommand: true });

		if(!parsed.success) return;

		parsed.command = parsed.command.toLowerCase();

		const command = this.Commands[parsed.command];
		if(!command) {
			throw new Error('Unknown command');
		}

		const hasPrivileges = await this.checkPrivileges(message.author.id, command);
		if(!hasPrivileges) {
			throw new Error('User ' + message.author.username + ' missing privileges to command ' + parsed.command);
		}

		const hasEnoughParameters = parsed.arguments.length >= command.numParamsRequired;
		if(!hasEnoughParameters) {
			message.author.send('Użycie komendy: ' + this.getUsage(command));
			return;
		}

		await command.func(parsed, message);
	
	 }

	 async checkPrivileges(userId, command) {
		const query = { 
			id: userId,
			groups : { $in : command.privileges}
		};
		let queryResult = await db.users().findOne(query);
		
		return queryResult ? true : false;
	}

	// async getUser(userId) {
	//	 const query = { 
	//		 id: userId,
	//	 };
	//	 return await db.users().findOne(query);
	// }
	

};

const CmdManager = new CommandsManager();


exports.login = async function() {
	client.login( 'ODQ0OTU5OTE1NTg3Nzk3MDY1.YKaAPg.XcA-_KDI6KCrngFVVQLprnBxOqc' )
		.then( (token) => {
			log.info('Logged in succesfully as bot!');
		}).catch( (e) => {
			throw new Error(e)
		});
}

/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */

client.on('ready', async () => {
	
	log.info('Client succesfully logged in, ready!');

	await refresh();

	client.user.setActivity('DOIN THE JOB!', { type: 'WATCHING'});

});

async function allMessage(parsed, message) {
	
	if(!message.guild?.id) {
		message.reply('Wyślij wiadomość na kanale gildi!');
		return;
	}

	const query = {
		//id: message.author.id,
		guilds : message.guild.id 
	};
	let users = await db.users().find(query).toArray();


	let content = 'Zatwierdź wiadomość do wszystkich!\n\n';

	let sendMessage = '> **Ogłoszenie od <@' + message.author.id + '>**\n\n';
	const embed = new Discord.MessageEmbed()
		.setColor('#00ff00')
		.setDescription(parsed.body);

	const buttons = new Discord.MessageActionRow()
		.addComponents([
		new Discord.MessageButton()
			.setCustomID('all_message_approve_button')
			.setLabel('Approve')
			.setStyle('SUCCESS'),
		new Discord.MessageButton()
			.setCustomID('all_message_dismiss_button')
			.setLabel('Dismiss')
			.setStyle('DANGER')
		
		]);

	content += '----------\n' + sendMessage;

	let approveMessage = await message.reply(content, { embed: embed, components: [buttons]})

	const filter = interaction => interaction.customId === 'all_message_approve_button' || interaction.customId === 'all_message_dismiss_button';
	const collector = approveMessage.createMessageComponentInteractionCollector(filter, { time: 20000 });

	collector.on('collect', (interaction) => {

		if(interaction.customId === 'all_message_approve_button') {

			interaction.deferUpdate();
			approveMessage.edit('**Wiadomość została wysłana!**', {components: [], embed: null});
			users.forEach( user => {
		
				// need to fetch before?
				let userInCache = client.users.cache.get(user.id);
				if(userInCache) {
					userInCache.send(sendMessage, { embed: embed });
				}
			});

		} else {
			interaction.deferUpdate();
			approveMessage.edit('**Anulowano wysyłanie wiadomości!**', {components: [], embed: null});
		}

		collector.stop();
	});

	collector.on('end', collected => {
		if(collected.size == 0) {
			approveMessage.edit('**Anulowano wysyłanie wiadomości!**', {components: [], embed: null} );
		}	
	});

	
}

async function trackMessage(parsed, message) {
	if(message.channel.type == 'text') {
		let path = parsed.arguments[0];

	} else {
		// error not in channel
	}
}

async function reportsMessage(parsed, message) {

	let hours = await db.hours().aggregate([
		{ $match: { userId: message.author.id } },
		{ $lookup: { 
			from: 'guilds',
			let: { localGuildId: '$guildId' },
			pipeline: [
					{ $match: { 
						$expr: {
							$eq: ['$id', '$$localGuildId']
						},
					} 
				},
				{ $project: { name: '$name', _id: 0 } },
				{ $replaceRoot: { newRoot: '$$ROOT' } }
			 ],
			as: 'guild'
		}},
		{ $project: {
			guild: {$arrayElemAt: [ '$guild', 0 ] },
			year: {$year: {date:'$firstDay',timezone:'Europe/Warsaw'}},
			month: {$month: {date:'$firstDay',timezone:'Europe/Warsaw'}},
			schedules: {
				$map: {
					input: '$schedules',
					as: 'schedule',
					in: {
						duration: {$divide: [{$subtract: ['$$schedule.dateEnd', '$$schedule.dateStart']}, 1000]},
						day:{$dayOfMonth:{date:'$$schedule.dateStart',timezone:'Europe/Warsaw'}},
						dayEnd: {$dayOfMonth:{date:'$$schedule.dateEnd',timezone:'Europe/Warsaw'}},
						hour:{$hour:{date:'$$schedule.dateStart',timezone:'Europe/Warsaw'}},
						hourEnd:{$hour:{date:'$$schedule.dateEnd',timezone:'Europe/Warsaw'}},
						minute:{$minute:{date:'$$schedule.dateStart',timezone:'Europe/Warsaw'}},
						minuteEnd:{$minute:{date:'$$schedule.dateEnd',timezone:'Europe/Warsaw'}},
					}
				}  
			},
		}},
		{ $sort: { 'schedules.dateStart': 1}}
	]).toArray();

	let link = manager.generateOneTimeReport(hours);

	message.author.send(link);

	//console.log(JSON.stringify(hours, null, '\t'));
} 

async function commandsMessage(parsed, message) {
	const query = { 
		id: message.author.id,
	};

	let user = await db.users().findOne(query);

	if(user) {
		let commands = CmdManager.getList(user.groups);

		let outString = '```\nDostępne komendy:\n';
		for(let i = 0 ; i < commands.length ; i++) {
			outString +=  CmdManager.getUsage(commands[i]) + ' - ' + CmdManager.getDesc(commands[i]) + '\n';
		}
		outString += '```';
		message.author.send(outString);
	}
}

async function refreshMessage(parsed, message) {
	await refresh();
}


async function createUser(member) {
	const updateDoc = {
		$set: {
		  id: member.user.id,
		  name: member.user.username,
		},
		$addToSet: { 
			guilds: member.guild.id
		},
		$setOnInsert: {
			groups: ['employee'],
			privilegeLevel: 0,
			lastSchedules: {}
		}
	};

	// later on we should batch update all at once
	let result = await db.users().updateOne({id: member.user.id}, updateDoc, {upsert: true});
}

const WorkhoursManager = require('./workhoursManager');


async function updateDatabase() {
	log.verbose('Fetching guilds');
	let guilds = client.guilds.cache;

	for (const [snowflake, guild] of guilds) {
	   
		log.info('Guild ' + guild.name);

		if(guild.name === 'FFS') {
			continue;
		}

		await fetchUsers(guild);

		const guildDoc = {
			$set: {
			  id: guild.id,
			  name: guild.name,
			},
			$setOnInsert: {
				workhours: {
					isActive: true,
					settings: {
						channelId: null,
					}
				},
				preforceServers: []
			}
		};

		// later on we should batch update all at once
		await db.guilds().updateOne({id: guild.id}, guildDoc, {upsert: true});

	};

	log.verbose('Finished fetching guilds');
}

async function fetchUsers(guild) {

	log.verbose('Fetching all users from guild ' + guild.name);

	let channels = guild.channels.cache;
	
	for(const [snowflake, channel] of channels) {
		for (const [snowflake, member] of channel.members) {
			//Skip bot
			if(member.user.id == client.user.id) {
				continue;
			}

			await createUser(member);
		}
	}

	log.verbose('Finished fetching users');
}

async function createWorkhoursManagers() {

	let cachedGuilds = client.guilds.cache;
	const guilds = await db.guilds().find().toArray();

	for(const guild of guilds) {
		if(guild?.workhours?.isActive) {

			let cachedGuild = cachedGuilds.find(g => g.id == guild.id);

			await WorkhoursManager.create(client, cachedGuild, guild.workhours.settings);
		}
	}


	// let guilds = client.guilds.cache;

	// for (const [snowflake, guild] of guilds) {
	   
	// 	//WorkhoursManager.create(client, guild);

	// };
}

const PerforceManager = require('./perforceManager');

async function createPerforceManagers() {
	let cachedGuilds = client.guilds.cache;
	const guilds = await db.guilds().find().toArray();

	for(const guild of guilds) {
		if(guild?.perforce) {

			let cachedGuild = cachedGuilds.find(g => g.id == guild.id);

			await PerforceManager.create(client, cachedGuild, guild.perforce);
		}
	}
}

async function refresh() {
	bIsReady = false;
	

	await updateDatabase();

	await createWorkhoursManagers();

	await createPerforceManagers();

	log.info('Is ready FINALLY!!!!!');
	bIsReady = true;
}

async function mialekMessage(parsed, message) {

	const query = {
		//id: message.author.id,
		groups : { $in : ['weedlover']  } 
	};
	let users = await db.users().find(query).toArray();

	let gotPrivileges = false;
	users.forEach( user => {
		if(user.id == message.author.id) {
			gotPrivileges = true;
		}
	});

	if(!gotPrivileges) {
		throw new Error('User ' + message.author.username + ' initiated command miałek without privileges!');
		
	}

	users.forEach( user => {
		let sendMessage = '```diff\n+Użytkownik ' + message.author.username + ' oficjalnie zaprasza wszystkich na 🚬\n```';
		if(parsed.body.trim().length > 0) {
			sendMessage = '```diff\n-Weed Lovers Newsletter\n-' + 'Użytkownik ' + message.author.username + '\n+' + parsed.body + '\n```';
		}
		client.users.cache.get(user.id).send(sendMessage);
	});
}

// deprecated!
// client.on('interaction', async interaction => {
// 	//if (!interaction.isMessageComponent() && interaction.componentType !== 'BUTTON') return;
// 	// if (interaction.customId === 'primary') {
// 	// 	await interaction.update('A button was clicked!', { components: [] });
// 	// }

// 	//console.log(interaction);
// });

async function inMessage(parsed, message) {

}

async function outMessage(parsed, message) {

}
async function removeGroupMessage(parsed, message) {

	let user = getUserFromMention(parsed.arguments[0]);

	//check if this works
	if(!user) {
		console.log(user);
		return;
	}

	let isnum = /^\d+$/.test(user.id);
	if(!isnum) {
		message.author.send('Id nie jest liczbą!');
		return;
	}

	let removeGroup = parsed.arguments[1];

	if(!GROUP[removeGroup.toUpperCase()]) {
		message.author.send('Podana grupa nie istnieje!');
		return;
	}

	const query = {
		id: parsed.arguments[0],
	};
	
	const update = {
		$pull: { 
			groups: removeGroup
		},
	};
	let updatedUser = await db.users().findOneAndUpdate(query, update);
	
	updatedUser = updatedUser.value;
	if(updatedUser) {

		//#1DB954
		const embed = new Discord.MessageEmbed()
			.setColor('#1DB954')
			.setTitle('Grupy')
			.setDescription('Usunięto grupę ' + removeGroup + ' użytkownikowi ' + updatedUser.name);

		message.channel.send(embed);
		//message.author.send('Usunięto grupe ' + removeGroup + ' użytkownikowi ' + updatedUser.name);
	}

}

function getUserFromMention(mention) {

	
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return mention;
	}
}

async function setGroupMessage(parsed, message) {

	let user = getUserFromMention(parsed.arguments[0]).trim();
	

	console.log('User: ' + user);
	//check if this works
	if(!user) {
		return;
	}

	
	let isnum = /^\d+$/.test(user);
	//let isnum = /^\d+$/.test(parsed.arguments[0]);
	if(!isnum) {
		message.author.send('Id nie jest liczbą!');
		return;
	}

	let newGroup = parsed.arguments[1];

	if(!GROUP[newGroup.toUpperCase()]) {
		message.author.send('Podana grupa nie istnieje!');
		return;
	}

	const query = {
		id: parsed.arguments[0],
	};
	
	const update = {
		$addToSet: { 
			groups: newGroup
		},
	};
	let error;
	let updatedUser = await db.users().findOneAndUpdate(query, update)
		.catch( e => {
			error = e;
		});

	updatedUser = updatedUser.value;
	//#1DB954
	const embed = new Discord.MessageEmbed()
	
	.setTitle('Grupy')


	

	if(updatedUser) {
		embed.setDescription('Dodano grupę ' + removeGroup + ' użytkownikowi ' + updatedUser.name);
		embed.setColor('#1DB954');

		message.channel.send(embed);
	} else {
		embed.setDescription('Podany użytkownik należy już do tej grupy');
		embed.setColor('#FF0000');

		message.author.send(embed);
	}


	
}

client.on('rateLimit', info => {
	console.log('RATE LIMIT!');
	log.info(JSON.stringify(info));
});


// Create an event listener for messages
client.on('messageCreate', message => {

	CmdManager.dispatch(message)
		.then( () => {

		}).catch( (error) => {
			log.error('Dispatch error ' + error);
		});


	// //Always clear messages on workChannel, it needs to be kept clean
	// if(message.guild && bIsReady && guildsContainer[message.guild.id]) {
	// 	if(message.channel.id == guildsContainer[message.guild.id].workChannel.id) {
	// 		message.delete({timeout: 100})
	// 			.catch( e => {
	// 				log.error(e);
	// 			})
	// 	}
	// }


	
//	 let prefix = '/';
//   // If the message is 'ping'
//	  if (message.content === prefix + 'hello') {
//		 // Send 'pong' to the same channel
//		 let date = moment().locale('pl').format('llll');
//		 message.reply(date);
//		 message.react('😉');

	

   
//	 // https.get('https://random.dog/woof.json', (resp) => {
//	 //	 let data = '';

//	 //	 // A chunk of data has been received.
//	 //	 resp.on('data', (chunk) => {
//	 //		 data += chunk;
//	 //	 });
	
//	 //	 // The whole response has been received. Print out the result.
//	 //	 resp.on('end', () => {
//	 //		 console.log(JSON.parse(data));

//	 //		 data = JSON.parse(data);
//	 //		 //console.log(message);
//	 //		 if(data.url) {
//	 //			 console.log('Sending dog');

//	 //			 const attachment = new Discord.MessageAttachment(data.url);
//	 //			 message.author.send('Random DOG', attachment);
//	 //		 }
//	 //	 }); 
//	 // }).on('error', (err) => {
//	 //	 console.log('Error: ' + err.message);
//	 // });





//	 //
//	 }
});



/**
 * Indents the given string
 * @param {string} str  The string to be indented.
 * @param {number} numOfIndents  The amount of indentations to place at the
 *	 beginning of each line of the string.
 * @param {number=} opt_spacesPerIndent  Optional.  If specified, this should be
 *	 the number of spaces to be used for each tab that would ordinarily be
 *	 used to indent the text.  These amount of spaces will also be used to
 *	 replace any tab characters that already exist within the string.
 * @return {string}  The new string with each line beginning with the desired
 *	 amount of indentation.
 */
 function indent(str, numOfIndents, opt_spacesPerIndent) {
	str = str.replace(/^(?=.)/gm, new Array(numOfIndents + 1).join('\t'));
	numOfIndents = new Array(opt_spacesPerIndent + 1 || 0).join(' '); // re-use
	return opt_spacesPerIndent
	  ? str.replace(/^\t+/g, function(tabs) {
		  return tabs.replace(/./g, numOfIndents);
	  })
	  : str;
  }