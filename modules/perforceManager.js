
const Discord = require('discord.js');

const { spawn } = require('child_process');

const cron = require('node-cron');

const db = require('./db');

const PERFORCE_CHANNEL_NAME = 'perforce';


class PerforceManager {
	constructor(client, guild, perforceData) {
		this.client = client;
		this.guild = guild;
		this.servers = perforceData.servers;
		this.settings = perforceData.settings;

		this.log = require('./log')('perforce-' + this.guild.name);

		this.bIsValid = false;

		this.reportChannel = null; 
	}

	async initialize() {

		if(this.settings.reportChannelId) {
			this.reportChannel = this.#findChannelById(this.settings.reportChannelId);
		}

		if(!this.reportChannel) {
			this.reportChannel = this.#findChannelByName(PERFORCE_CHANNEL_NAME);
		}

		if(!this.reportChannel) {
			this.bIsValid = false;
			this.log.warn('Couldnt find any good target for perforce channel');
			return false;
		}

		this.log.info('Manager created and running');

		this.bIsValid = true;

		this.runBackup();

		return true;
	}

	#findChannelById(id) {
		this.log.verbose('Looking for set perforce channel');

		const channels = this.guild.channels.cache;
		const foundChannel = channels.find(channel => channel.id === id && channel.isText());

		if(foundChannel) {
			this.log.verbose('Perforce channel \'' + foundChannel.name + '\' found');
			return foundChannel;
		}
		
		this.log.warn('Guild ' + this.guild.name + ' missing channel ' + id + '. Fallback to search by name.');
	}

	#findChannelByName(name) {
	
		const channels = this.guild.channels.cache;

		const foundChannel = channels.find(channel => channel.name === name && channel.isText());

		if(foundChannel) {
			this.log.verbose('Perforce channel \'' + name + '\' found');
			return foundChannel;
		}
		
		this.log.warn('Guild ' + this.guild.name + ' missing channel ' + name);
	}


	async runBackup() {

		for(let i = 0 ; i < this.servers.length ; i++) {
			let backupProc = spawn('/home/fox/p4backup.sh', [
				this.servers[i].depotDir, 
				this.servers[i].depotDir,
				this.servers[i].backupDir, 
				this.servers[i].address,
				this.servers[i].username,
			]);

			backupProc.stdout.on('data', data => {
			    console.log("out: " + data);
			});

			backupProc.stderr.on("data", data => {
			    console.log(`stderr: ${data}`);
			});
			
			backupProc.on('error', (error) => {
			    console.log(`error: ${error.message}`);
			});
			
			backupProc.on("close", code => {
			    console.log(`child process exited with code ${code}`);
			});
		}
	
	}

}

let Managers = new Map();

// cron.schedule('0 0 * * 1', async () => {
// 	Managers.forEach((manager, guildId, map) => {
// 		manager.runBackup();
// 	} );
// });

async function create(client, guild, perforceData) {

	if(client && guild) {
		let newManager = new PerforceManager(client, guild, perforceData);
		if(await newManager.initialize()) {
			Managers.set(guild.id, newManager);

			return newManager;
		}
	} 

	throw new Error('Error creating new workhours manager');
}

module.exports = {
	create: create,
}