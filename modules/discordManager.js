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




let guildsContainer = {};

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
	
	log.info('I am ready!');

	await refresh();

	client.user.setActivity('Harry Potter', { type: 'WATCHING'});
	setInterval(workhoursAutoLogout, 1000 * 60); // once a minute
});


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

	await db.users().updateOne({id: member.user.id}, updateDoc, {upsert: true});
}

async function refresh() {
	bIsReady = false;
	let guilds = client.guilds.cache;

	for (const [snowflake, guild] of guilds) {
	   
		log.info('Guild ' + guild.name);

		if(guild.name === 'FFS') {
			continue;
		}

		let newGuild = {
			name: guild.name
		};
	
		let channels = guild.channels.cache;
		
		channels.forEach(channel => {
			if(channel.name == WORK_CHANNEL_NAME) {
				newGuild.workChannel = channel;


				const flags = [
					'VIEW_CHANNEL',
					'EMBED_LINKS',
					'READ_MESSAGE_HISTORY',
				];
				
				const permissions = new Discord.Permissions(flags);

				//console.log(permissions.serialize());
				channel.updateOverwrite(channel.guild.roles.everyone, permissions.serialize());
				//console.log(channel.guild.roles.everyone);
				
				log.info('Work channel ' + WORK_CHANNEL_NAME + ' found on server ' + guild.name);
			}
			// If we find more than one then what? Remove and leave only one?
			//If not we should create one!
		});

		if(!newGuild.workChannel) {
			log.error('Guild ' + guild.name + ' missing channel ' + WORK_CHANNEL_NAME);
			continue;
		}


		async function wipe() {
			var msg_size = 100;
			while (msg_size == 100) {
				await newGuild.workChannel.bulkDelete(100)
					.then(messages => msg_size = messages.size)
					.catch(console.error);
			}
		}
		await wipe();


		// let clearChannel = async function() {
		//	 let deleted = await newGuild.workChannel.bulkDelete(100)
		//		 .catch( error => {
		//			 log.error('Error clearing channel ' + error);
		//		 });
			
		//	 return deleted.size;
		// }

		// let messagesDeleted = 0;
		// messagesDeleted = await clearChannel();

		

		newGuild.users = [];
		for (const [snowflake, member] of newGuild.workChannel.members) {
			//Skip bot
			if(member.user.id == client.user.id) {
				continue;
			}
			await createUser(member);
		}

		log.info('Loaded all users');

		const guildDoc = {
			$set: {
			  id: guild.id,
			  name: guild.name,
			},
			$setOnInsert: {
				preforceServers: []
			}
		};

		await db.guilds().updateOne({id: guild.id}, guildDoc, {upsert: true});

		guildsContainer[guild.id] = newGuild;

		await updateHoursTable(guild.id);
	};

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

client.on('interaction', async interaction => {
	//if (!interaction.isMessageComponent() && interaction.componentType !== 'BUTTON') return;
	// if (interaction.customID === 'primary') {
	// 	await interaction.update('A button was clicked!', { components: [] });
	// }

	//console.log(interaction);
});

async function updateHoursTable(guildId, lastUserEvent) {

	if(!guildId) {
		log.error("Undefined guild passed to updateHoursTable");
		return;
	}

	const guildContainer = guildsContainer[guildId];
	if(!guildContainer) {
		log.error("Wrong guild id passed to updateHoursTable");
		return;
	}

	log.verbose("Updating workhours table for guild " + guildContainer.name);
	const schedule = 'lastSchedules.' + guildId;

	let users = [];

	let activeUsers = [];
	let inactiveUsers = [];
	await db.users().aggregate([
		{ 
			$match: { 
				guilds: guildId,
				[schedule] : { 
					$exists: true,
				}   
			} 
		},
		{ 
			$sort : { 
				[schedule + '.dateStart'] : 1
			} 
		}
	]).forEach( user => {
		let lastSchedule = user.lastSchedules[guildId];
		if(lastSchedule.dateEnd == null) {
			activeUsers.push({
				name: user.name,
				dateStart: lastSchedule.dateStart,
				dateEnd: null,
				isActive: true
			});
			// console.log(new Date(user.lastSchedules[guildId].dateStart).toString());
			// console.log('users foreach');
		} else {
			inactiveUsers.push({
				name: user.name,
				dateStart: lastSchedule.dateStart,
				dateEnd: lastSchedule.dateEnd,
				isActive: false
			});
		}
	  
	});


	const fixUsernames = function(userList) {

		let longestUsername = 0;
		for(let i = 0 ; i < userList.length ; i++) {
			let newUsernameLength = userList[i].name.length; 
			if(newUsernameLength > longestUsername) {
				longestUsername = newUsernameLength;
			}
		}
	
		for(let i = 0 ; i < userList.length ; i++) {
			let usernameLength = userList[i].name.length;
			let dif = longestUsername - usernameLength;
			if(dif > 0) {
				userList[i].name += ' '.repeat(dif);
			}
		}
	}
	users.push(...activeUsers);
	users.push(...inactiveUsers);


	fixUsernames(users);

	let hoursMsg = '```diff\n';

	for(let i = 0 ; i < users.length ; i++) {

		let prefix = '';
		if(i < 9) {
			prefix = ' ';
		}
		
		if(users[i].isActive) {
			const dateStart = moment(users[i].dateStart).format('HH:mm');
			hoursMsg += '+' + (i + 1) + '. ' + prefix + users[i].name + ' - ' + dateStart + ' - ' + 'xx:xx' + '\n';
		} else {
			const dateStart = moment(users[i].dateStart).format('HH:mm');
			const dateEnd = moment(users[i].dateEnd).format('HH:mm');
	
			const lastSeen = moment(users[i].dateEnd).format('L');
	
			hoursMsg += '-' + (i + 1) + '. ' + prefix + users[i].name + ' - ' + dateStart + ' - ' + dateEnd + ' Ostatnio: ' + lastSeen + '\n';
		}
	}

	hoursMsg += '\n```';

	const buttons = new Discord.MessageActionRow()
		.addComponents([
		new Discord.MessageButton()
			.setCustomID('workhours_login_button')
			.setLabel('Login')
			.setStyle('SUCCESS'),
		new Discord.MessageButton()
			.setCustomID('workhours_logout_button')
			.setLabel('Logout')
			.setStyle('DANGER')
		
		]);

	let content = '**-- Przedszkolna lista obecności --**';

	// if(lastUserEvent) {
	// 	if(lastUserEvent.event == 'login') {
	// 		content = 'Użytkownik <@' + lastUserEvent.id + '> rozpoczął pracę';
	// 	} else {
	// 		content = 'Użytkownik <@' + lastUserEvent.id + '> zakończył pracę';
	// 	}
	// }

	const embed = new Discord.MessageEmbed()
		.setColor('#0099ff')
		//.setTitle('Timetable')
		.setDescription(hoursMsg);


	async function createMessage(container) {
		container.workhoursTable = {
			temporaryMessages: {
				sendTimer: null,
				deleteTimer: null,
				sent: [],
				waiting: []
			}
		};
		container.workhoursTable.message = await container.workChannel.send(content, { embed: embed, components: [buttons]})
		.catch( e => {
			log.error(e);
		});
	
		container.workhoursTable.collector = createCollectorForWorkhours(container);
	}
	
	if(!guildContainer.workhoursTable) {
		await createMessage(guildContainer);
	} else {
		await guildContainer.workhoursTable.message.edit(content, { embed: embed, components: [buttons]})
		.catch( (error) => {
			if(error.code == 10008) { // No message found
				createMessage(guildContainer);
			}
		});

		if(lastUserEvent) {
			let tempMessage;
			if(lastUserEvent.event == 'login') {
				tempMessage = 'Użytkownik <@' + lastUserEvent.id + '> zalogował się!';
				//tempMessage = await guildContainer.workChannel.send('Użytkownik <@' + lastUserEvent.id + '> zalogował się!');
			} else {
				if(!lastUserEvent.userAction) {
					tempMessage = 'Użytkownik <@' + lastUserEvent.id + '> został automatycznie wylogowany!';
				} else {
					tempMessage = 'Użytkownik <@' + lastUserEvent.id + '> wylogował się!';
				}
				
				//tempMessage = await guildContainer.workChannel.send('Użytkownik <@' + lastUserEvent.id + '> wylogował się!');
			}
			let messages = guildContainer.workhoursTable.temporaryMessages;


			var sendWaitingMessages = async function(messagesContainer) {
				let messageToSend = '';

				let messageTitle = '';
				if(messagesContainer.waiting.length > 1) {
					messageToSend = '**' + messagesContainer.waiting.length + ' użytkowników zmieniło status:**';
				}
				for(let i = 0 ; i < messagesContainer.waiting.length ; i++) {
					messageToSend += '\n> ' + messagesContainer.waiting[i];
				}
				messagesContainer.waiting = [];

				
				const usersChangeEmbed = new Discord.MessageEmbed()
				.setColor(Discord.Util.resolveColor("GREEN"))
				.setTitle(messageTitle)
				.setDescription(messageToSend);

				let sentMessage = await guildContainer.workChannel.send(messageToSend)
					.catch( (error) => {
						log.error(error);
					});

				client.setTimeout(() => sentMessage.delete(), 60000);
			}

			// timer is active so there is something in queue
			if(messages.sendTimer) {
				messages.waiting.push(tempMessage);
				clearTimeout(messages.sendTimer);

				messages.sendTimer = setTimeout( (messageContainer) => {
					sendWaitingMessages(messageContainer);
				}, 3000, messages);

			} else {
				messages.waiting.push(tempMessage);

				messages.sendTimer = setTimeout((messageContainer) => {
					sendWaitingMessages(messageContainer);
				}, 3000, messages);
			}


		}
	}
}

function createCollectorForWorkhours(guildContainer) {
	log.verbose("Creating workhours collector for guild " + guildContainer.name);

	const filter = interaction => interaction.customID === 'workhours_login_button' || interaction.customID === 'workhours_logout_button';
	let collector = guildContainer.workhoursTable.message.createMessageComponentInteractionCollector(filter, { time: 2147483000 }); //2147483000

	collector.on('collect', (interaction) => {
		
		if(interaction.customID === 'workhours_login_button') {
			workhoursInInteraction(interaction);
		} else {
			workhoursOutInteraction(interaction);
		}
	});
	collector.on('end', collected => {
		log.verbose("Workhours collector for guild " + guildContainer.name + " finished! Recreating!");

		if(guildContainer.workhoursTable?.message) {
			createCollectorForWorkhours(guildContainer);
		} else { 
			guildContainer.workhoursTable = null;
			updateHoursTable(guildContainer.workhoursTable.message.guild.id);
		}
	});

	return collector;
}


////////////////////////
async function workhoursInInteraction(interaction) {

	interaction.deferUpdate();

	let guildId = interaction.guild.id;

	//globalMsg.edit('user changed to ' + message.client.user.username);
	//message.author.id
	const authorId = interaction.user.id;

	let user = await db.users().findOne({id: authorId});

	if(!user) {
		createUser(interaction.member)
	}

	const newSchedule = 'lastSchedules.' + guildId;
	const newScheduleEnd = newSchedule + '.dateEnd';
	const query = {
		
		id: authorId,
		$or : [
			{ [newSchedule] : { $exists: false} },
			{ [newScheduleEnd] : { $ne: null} } 
		]
	};
	const updateDoc = {
		$set : {
			[newSchedule]: {
				dateStart: new Date(),
				dateEnd: null
			}
		}
	};

	const setActiveScheduleQuery = await db.users().findOneAndUpdate(query, updateDoc);
	let userFound = setActiveScheduleQuery.lastErrorObject.n;

	if(userFound) {
		let lastUserEvent = {
			id: authorId,
			event: 'login',
			userAction: true
		};

		updateHoursTable(interaction.guild.id, lastUserEvent);
	}else {
		await interaction.followUp('Jesteś już zalogowany/a!', { ephemeral: true })
			.catch( (error) => {
				console.log(error);
			});


	}
}

async function workhoursOut(userId, guildId, userAction = true) {

	const lastSchedule = 'lastSchedules.' + guildId;
	const lastScheduleEnd = lastSchedule + '.dateEnd';
	const query = {
		
		id: userId,
		[lastScheduleEnd] : { $exists: true, $eq: null}
	};

	let endDate = new Date();
	const updateDoc = {
		$set : {
			[lastScheduleEnd]: endDate
		}
	};

	//const user = await db.users().findOne(query);
	const outQuery = await db.users().findOneAndUpdate(query, updateDoc);
	let userFound = outQuery.lastErrorObject.n;
	let foundUser = outQuery.value;

	if(userFound) {
		let lastUserEvent = {
			id: userId,
			event: 'logout',
			userAction: userAction
		};

		updateHoursTable(guildId, lastUserEvent);

		//const dateNow = moment(new Date()).format('YYYY-MM-DD[T00:00:00.000Z]');

		let start = moment(foundUser.lastSchedules[guildId].dateStart);
		const startOfMonth = start.utc().startOf('month');
		const endOfMonth   = startOfMonth.clone().utc().endOf('month');

		const startMonthDate = startOfMonth.toDate();
		const endMonthDate = endOfMonth.toDate();

		const query = {
			userId: userId,
			guildId: guildId,
			firstDay: {
				$eq: startMonthDate
			},
			lastDay: {
				$eq: endMonthDate
			}
		};

		const update = {
			$setOnInsert: {
				userId: userId,
				guildId: guildId,
				firstDay: startMonthDate,
				lastDay: endMonthDate,
			},
			$push: {
				'schedules': {
					dateStart: foundUser.lastSchedules[guildId].dateStart,
					dateEnd: endDate
				}
			}
		};

		const updated = await db.hours().updateOne(query, update, {upsert: true});
	 
		if(updated.matchedCount == 1) {
			
			return true;
		}
	} else {
		return false;
	}
}


async function workhoursAutoLogout() {

	//let users = await db.users().find().toArray();

	let dateNow = new Date(Date.now() - 1000 * 60 * 60 * 20); // 20 hours

	let users = await db.users().aggregate([
		{ $project: { 
			_id: 0,
			id: 1,
			name: 1,
			schedule: { 
				$objectToArray: "$lastSchedules" 
			} 
		} },
		{ $unwind: "$schedule" },
		{ $match: { 
			//'schedules.v.dateStart' : { $ne: null },//{ $elemMatch : { v: { dateStart: { $ne: null} } } },
			'schedule.v.dateStart' : { $lt: dateNow },
			'schedule.v.dateEnd' : { $eq: null }, 
		} },
		//{ $group: { userId: "userId", name: "name"}}
	]).toArray();

	log.debug('Automatic logout scan, looking for target before ' + dateNow.toUTCString());

	users.forEach( async (user) => {
		console.log("User found: ");
		log.debug("Autologout " + JSON.stringify(user));

		await workhoursOut(user.id, user.schedule.k, false);
	});
}


async function workhoursOutInteraction(interaction) {

	interaction.deferUpdate();
	let guildId = interaction.guild.id;

	const authorId = interaction.user.id;

	let user = await db.users().findOne({id: authorId});

	if(!user) {
		createUser(interaction.member)
	}

	const success = await workhoursOut(authorId, guildId);
	if(!success) {
		interaction.followUp('Nie jesteś obecnie zalogowany/a do pracy.', { ephemeral : true })
	}
}
/////////////////////////////



async function inMessage(parsed, message) {

	if(!message.guild) {
		message.reply('Wybacz ale nie robie takich rzeczy prywatnie, tylko workhours! ;)');
		return;
	}

	let guildId = message.guild.id;

	//globalMsg.edit('user changed to ' + message.client.user.username);
	//message.author.id
	const authorId = message.author.id;


	const newSchedule = 'lastSchedules.' + guildId;
	const newScheduleEnd = newSchedule + '.dateEnd';
	const query = {
		
		id: authorId,
		$or : [
			{ [newSchedule] : { $exists: false} },
			{ [newScheduleEnd] : { $ne: null} } 
		]
	};

	//let dateNow = new Date();

	//console.log('Offset: ' + dateNow.getTimezoneOffset());

	const updateDoc = {
		$set : {
			[newSchedule]: {
				dateStart: new Date(),
				dateEnd: null
			}
		}
	};


	//const user = await db.users().findOne(query);
	const setActiveScheduleQuery = await db.users().findOneAndUpdate(query, updateDoc);
	let userFound = setActiveScheduleQuery.lastErrorObject.n;

	if(userFound) {
		updateHoursTable(message.guild.id);
	}else {
		message.author.send('Jesteś już zalogowany!');
	}
}

async function outMessage(parsed, message) {

	if(!message.guild) {
		message.reply('Wybacz ale nie robie takich rzeczy prywatnie, tylko workhours! ;)');
		return;
	}

	let guildId = message.guild.id;

	const authorId = message.author.id;

	const lastSchedule = 'lastSchedules.' + guildId;
	const lastScheduleEnd = lastSchedule + '.dateEnd';
	const query = {
		
		id: authorId,
		[lastScheduleEnd] : { $exists: true, $eq: null}
	};

	let endDate = new Date();
	const updateDoc = {
		$set : {
			[lastScheduleEnd]: endDate
		}
	};

	//const user = await db.users().findOne(query);
	const outQuery = await db.users().findOneAndUpdate(query, updateDoc);
	let userFound = outQuery.lastErrorObject.n;
	let user = outQuery.value;

	if(userFound) {

		updateHoursTable(message.guild.id);

		//save hours in database

		//const dateNow = moment(new Date()).format('YYYY-MM-DD[T00:00:00.000Z]');

		let start = moment(user.lastSchedules[guildId].dateStart);
		const startOfMonth = start.utc().startOf('month');
		const endOfMonth   = startOfMonth.clone().utc().endOf('month');

		const startMonthDate = startOfMonth.toDate();
		const endMonthDate = endOfMonth.toDate();

		const query = {
			userId: authorId,
			guildId: guildId,
			firstDay: {
				$eq: startMonthDate
			},
			lastDay: {
				$eq: endMonthDate
			}
		};

		const update = {
			$setOnInsert: {
				userId: authorId,
				guildId: guildId,
				firstDay: startMonthDate,
				lastDay: endMonthDate,
			},
			$push: {
				'schedules': {
					dateStart: user.lastSchedules[guildId].dateStart,
					dateEnd: endDate
				}
			}
		};

		const updated = await db.hours().updateOne(query, update, {upsert: true});
	 
		if(updated.matchedCount == 1) {
			log.info('User ' + user.name + ' quit. Hours saved!');
		}
	} else {
		message.author.send('Nie jesteś obecnie zalogowany/a do pracy. Najpierw użyj "/in" !');
	}

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
client.on('message', message => {

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