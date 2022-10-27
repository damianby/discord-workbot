/* eslint-disable no-prototype-builtins */
const Discord = require('discord.js');

const db = require('./db');
const moment = require('moment-timezone');

const factsManager = require('./facts');

const manager = require('./manager');

const WORK_CHANNEL_NAME = 'workhours';

const WORK_CHANNEL_PERMISSION_FLAGS = [
	'VIEW_CHANNEL',
	'EMBED_LINKS',
	'READ_MESSAGE_HISTORY',
];

const permissions = new Discord.Permissions(WORK_CHANNEL_PERMISSION_FLAGS);


class WorkhoursManager {

	constructor(client, guild, settings) {
		this.client = client;
		this.guild = guild;
		this.settings = settings;

		this.log = require('./log')('workhours-' + this.guild.name);

		this.bIsValid = false;

		this.workChannel = null; 

		this.hoursDisplayMessage = null;
		this.messageCollector = null;

		this.temporaryMessages = {
			sendTimer: null,
			sent: [],
			waiting: []
		};

	}

	async initialize() {

		if(this.settings.channelId) {
			this.workChannel = this.#findWorkChannelById(this.settings.channelId);
		}

		if(!this.workChannel) {
			this.workChannel = this.#findWorkChannelByName(WORK_CHANNEL_NAME);
		}

		if(!this.workChannel) {
			this.bIsValid = false;
			this.log.warn('Couldnt find any good target for workhours channel');
			return false;
		}

		await this.#updateWorkhoursSettings();
		await this.#setChannelPermissions();
		await this.#wipe();
		await this.updateHoursTable();

		this.log.info('Manager created and running');

		this.bIsValid = true;
		return true;
	}

	async #updateWorkhoursSettings() {

		const updateDoc = {
			$set: {
				'workhours.settings.channelId': this.workChannel.id,
			  },
		};

		await db.guilds().updateOne({id: this.guild.id}, updateDoc, {upsert: true});
	}

	#findWorkChannelById(id) {
		this.log.verbose('Looking for set workhours channel');

		const channels = this.guild.channels.cache;
		const foundChannel = channels.find(channel => channel.id === id && channel.isText());

		if(foundChannel) {
			this.log.verbose('Work channel \'' + foundChannel.name + '\' found');
			return foundChannel;
		}
		
		this.log.warn('Guild ' + this.guild.name + ' missing channel ' + id + '. Fallback to search by name.');
	}

	#findWorkChannelByName(name) {
	
		const channels = this.guild.channels.cache;

		const foundChannel = channels.find(channel => channel.name === name && channel.isText());

		if(foundChannel) {
			this.log.verbose('Work channel \'' + name + '\' found');
			return foundChannel;
		}
		
		this.log.warn('Guild ' + this.guild.name + ' missing channel ' + name);
	}

	async #setChannelPermissions() {
		await this.workChannel.permissionOverwrites.create(this.workChannel.guild.roles.everyone, permissions.serialize())
			.catch( e => {
				this.log.error(e);
			})
	}

	async #wipe() {
		this.log.verbose('Clearing \'' + this.workChannel.name + '\' channel');
		var msg_size = 100;

		while (msg_size == 100) {
			await this.workChannel.bulkDelete(100, true)
				.then(messages => {
					msg_size = messages.size;
				})
				.catch( (error) => {
					
					if(error.code == 50034) {
						this.log.error('Message older than 14 days, removing');
					} else {
						this.log.error(JSON.stringify(error));
					}
				});
		}

		// let messages = await this.workChannel.messages.fetch({ limit: 100 });

		// for(const [snowflake, message] of messages) {
		// 	await message.delete()
		// 		.catch( (e) => {
		// 			this.log.error(`Error deleting message ${e}`);
		// 		});
		// }

		this.log.verbose('Finished clearing \'' + this.workChannel.name + '\'');
	}

	isValid() {
		return this.bIsValid;
	}


	async #createMessage(content) {
		this.hoursDisplayMessage = await this.workChannel.send(content)
		.catch( e => {
			this.log.error(e);
		});
	
		this.messageCollector = await this.#createCollector();
	}

	
	async updateHoursTable(lastUserEvent) {

		const guildId = this.guild.id;

		this.log.silly('Updating workhours table');
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
					},
					groups: {
						$nin: ['notrack'],
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

		if(users.length == 0) {
			hoursMsg += 'Troche tu pusto, jeszcze nikt się nie zalogował 🦊';
		}

		hoursMsg += '\n```';

		const buttons = new Discord.MessageActionRow()
			.addComponents([
			new Discord.MessageButton()
				.setCustomId('workhours_login_button')
				.setLabel('Login')
				.setStyle('SUCCESS'),
			new Discord.MessageButton()
				.setCustomId('workhours_logout_button')
				.setLabel('Logout')
				.setStyle('DANGER'),
			new Discord.MessageButton()
				.setCustomId('workhours_report_button')
				.setLabel('Report')
				.setStyle('PRIMARY')
			]);


		let content = '**-- Przedszkolna lista obecności --**';

		const embed = new Discord.MessageEmbed()
			.setColor('#0099ff')
			//.setTitle('Timetable')
			.setDescription(hoursMsg);

		
		if(!this.hoursDisplayMessage) {
			await this.#createMessage({ content: content, embeds: [ embed ], components: [buttons]});
		} else {

			//Event triggered involving users, it might be by user action or not(auto logout)
			if(lastUserEvent) {

				if(lastUserEvent.interaction) {
					lastUserEvent.interaction.editReply({content: content, embeds: [embed] });
				} else {
					await this.hoursDisplayMessage.edit({content: content, embed: embed, components: [buttons]})
					.catch( async (error) => {
						if(error.code == Discord.Constants.APIErrors.UNKNOWN_MESSAGE) {
							await this.#createMessage({ content: content, embeds: [ embed ], components: [buttons]});
						}
					});
				}

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
				}

				// timer is active so there is something in queue
				if(this.temporaryMessages.sendTimer) {
					clearTimeout(this.temporaryMessages.sendTimer);
				}

				this.temporaryMessages.waiting.push(tempMessage);
				this.temporaryMessages.sendTimer = setTimeout(() => {
					this.#sendWaitingMessages();
				}, 3000);

			}
		}
	}

	async #sendWaitingMessages() {

		const messages = this.temporaryMessages;

		let messageToSend = '';

		let messageTitle = '';
		if(messages.waiting.length > 1) {
			messageToSend = '**' + messages.waiting.length + ' użytkowników zmieniło status:**';
		}
		for(let i = 0 ; i < messages.waiting.length ; i++) {
			messageToSend += '\n> ' + messages.waiting[i];
		}
		messages.waiting = [];

		
		const usersChangeEmbed = new Discord.MessageEmbed()
		.setColor(Discord.Util.resolveColor('GREEN'))
		.setTitle(messageTitle)
		.setDescription(messageToSend);

		// console.log('Before followup');
		// let sentMessage = await followUp(messageToSend)
		// 	.catch( (error) => {
		// 		log.error(error);
		// 	});

		// let sentMessage = await lastUserEvent.interaction.followUp(messageToSend)
		// 	.catch( (error) => {
		// 		log.error(error);
		// 	})

		let sentMessage = await this.workChannel.send(messageToSend)
			.catch( (error) => {
				this.log.error(error);
			});

		setTimeout(() => sentMessage.delete(), 60000);
	}

	async #createCollector() {
		this.log.verbose('Creating workhours collector');
	
		let fetchedMessage = await this.workChannel.messages.fetch(this.hoursDisplayMessage.id)
			.catch( (error) => {
				this.log.error('Failed to fetch workhours message');
				if(error.code == Discord.Constants.APIErrors.UNKNOWN_MESSAGE) {
					this.log.error('Message deleted!');
				}
				this.log.error(JSON.stringify(error));
	
				this.hoursDisplayMessage = null;
				this.updateHoursTable();
	
			});
	
		if(!fetchedMessage) {
			return;
		}
	
		const filter = interaction => interaction.customId === 'workhours_login_button' || interaction.customId === 'workhours_logout_button';
		let collector = fetchedMessage.createMessageComponentCollector(filter, { time: 2147483000 }); //2147483000
	
		this.log.verbose('Collector on channel ' + this.workChannel.name + ' created!');
	
		collector.on('collect', async (interaction) => {

			let user = await db.users().findOne({ id: interaction.user.id });

			if(user) {
				if(user.groups.includes('notrack')) {

					const errorEmbed = new Discord.MessageEmbed()
						.setColor('#ff0000')
						.setTitle('Nie możesz korzystać z tej funkcjonalności');

					interaction.reply({embeds: [errorEmbed], ephemeral: true});

					return;
				}
			}

			if(interaction.customId === 'workhours_login_button') {
				this.#workhoursInInteraction(interaction);
			} else if(interaction.customId === 'workhours_logout_button') {
				this.#workhoursOutInteraction(interaction);
			} else if(interaction.customId === 'workhours_report_button') {
				this.#generateReportInteraction(interaction);
			}
	
			collector.resetTimer();
		});
		collector.on('end', collected => {
			this.log.verbose('Workhours collector for finished! Recreating!');
	
			this.#createCollector();
		});
	
		return collector;
	}

	
	////////////////////////

	async #generateReportInteraction(interaction) {

		await interaction.deferUpdate();

		let hours = await db.hours().aggregate([
			{ $match: { userId: interaction.user.id } },
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
	
		const linkEmbed = new Discord.MessageEmbed()
			.setColor('#00ff00')
			.setTitle('Twój raport godzinowy')
			.setDescription('Wygenerowany link jest jednorazowy, dostępny tylko dla Ciebie i zostanie dezaktywowany po 10 minutach!')
			.setURL(link)
			.setFooter('Ta wiadomość zniknie za jakiś czas, jeśli Ci przeszkadza kliknij \'Odrzuć tę wiadomość\'');


		await interaction.followUp({ embeds: [linkEmbed], ephemeral: true })
				.catch( (error) => {
					console.log(error);
				});
	}

	async #workhoursInInteraction(interaction) {

		await interaction.deferUpdate();

		let guildId = interaction.guild.id;

		//globalMsg.edit('user changed to ' + message.client.user.username);
		//message.author.id
		const authorId = interaction.user.id;

		let user = await db.users().findOne({id: authorId});

		if(!user) {
			await interaction.reply({ content: 'Niestety nie ma Cię na liście obecności, to raczej nie powinno się zdażyć ^^', ephemeral: true })
				.catch( (error) => {
					this.log.error(JSON.stringify(error));
				});
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
				userAction: true,
				interaction: interaction,
			};

			this.updateHoursTable(lastUserEvent);

			// let fact = await factsManager.getRandomFact();

			// if(fact != null) {

			// 	const factEmbed = new Discord.MessageEmbed()
			// 		.setColor('#0099ff')
			// 		.addField('Twój bezużyteczny fakt na dzisiaj', fact, true)
			// 		.setFooter('Ta wiadomość zniknie za jakiś czas, jeśli Ci przeszkadza kliknij \'Odrzuć tę wiadomość\'');

			// 		//.setTitle('Twój losowy fakt na dzisiaj')
			// 		//.setDescription(fact);

			// 	interaction.followUp({ embeds: [factEmbed], ephemeral: true })
			// 	.catch( (error) => {
			// 		this.log.error(error);
			// 	});
			// }
		} else {

			const errorEmbed = new Discord.MessageEmbed()
			.setColor('#ff0000')
			.setTitle('Jesteś już zalogowany/a!');

			await interaction.followUp({ embeds: [errorEmbed], ephemeral: true })
				.catch( (error) => {
					console.log(error);
				});
		}
	}

	async workhoursOut(userId, guildId, interaction, userAction = true) {

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
				userAction: userAction,
				interaction: interaction,
			};

			this.updateHoursTable(lastUserEvent);

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

	async #workhoursOutInteraction(interaction) {

		await interaction.deferUpdate();
		let guildId = interaction.guild.id;

		const authorId = interaction.user.id;

		let user = await db.users().findOne({id: authorId});

		if(!user) {
			await interaction.followUp({ content: 'Niestety nie ma Cię na liście obecności, to raczej nie powinno się zdażyć ^^', ephemeral: true })
				.catch( (error) => {
					this.log.error(JSON.stringify(error));
				});
		} else {
			const success = await this.workhoursOut(authorId, guildId, interaction);
			if(!success) {

				const errorEmbed = new Discord.MessageEmbed()
				.setColor('#ff0000')
				.setTitle('Nie jesteś obecnie zalogowany/a do pracy!');

				interaction.followUp({ embeds: [errorEmbed], ephemeral : true });
			}
		}
	}
}


const managerLog = require('./log')('Workhours-Manager');

const Managers = {};

// This is outside class to not spam database looking for all users for every guild
async function workhoursAutoLogout() {

	//let users = await db.users().find().toArray();
	//let dateNow = new Date(Date.now() - 1000 * 5); // 5 secs
	let dateNow = new Date(Date.now() - 1000 * 60 * 60 * 20); // 20 hours

	let users = await db.users().aggregate([
		{ $project: { 
			_id: 0,
			id: 1,
			name: 1,
			schedule: { 
				$objectToArray: '$lastSchedules' 
			} 
		} },
		{ $unwind: '$schedule' },
		{ $match: { 
			//'schedules.v.dateStart' : { $ne: null },//{ $elemMatch : { v: { dateStart: { $ne: null} } } },
			'schedule.v.dateStart' : { $lt: dateNow },
			'schedule.v.dateEnd' : { $eq: null }, 
		} },
		//{ $group: { userId: 'userId', name: 'name'}}
	]).toArray();

	managerLog.debug('Automatic logout scan, looking for target before ' + dateNow.toUTCString());

	users.forEach( async (user) => {
		
		managerLog.verbose('User ' + user.name + ' was automatically logged out');
		managerLog.debug('Autologout ' + JSON.stringify(user));

		if(Managers[user.schedule.k]) {
			await Managers[user.schedule.k].workhoursOut(user.id, user.schedule.k, null, false)
		}
	});
}

setInterval(workhoursAutoLogout, 1000 * 60); // once a minute

async function create(client, guild, settings) {

	if(Managers[guild.id]) {
		return Managers[guild.id];
	} 

	if(client && guild) {
		let newManager = new WorkhoursManager(client, guild, settings);
		if(await newManager.initialize()) {
			Managers[guild.id] = newManager;

			return newManager;
		}
	} 

	throw new Error('Error creating new workhours manager');
}

function get(guildId) {
	let manager = Managers[guildId];
	if(manager) {
		return manager;
	} else {
		return null;
	}
}


// Indent all users based on longest name
function fixUsernames(userList) {

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




module.exports = {
	create: create,
	get: get,
};