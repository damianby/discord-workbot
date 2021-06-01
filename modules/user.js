
const log = require("./log")('user');



class User {

	constructor(id, name) {
		this.id = id;
		this.name = name;

		this.isActive = false;

	}


	sendCommand(command) {
		return new Promise(function(resolve, reject) {
			connectionmanager.sendCommand(this.ip, command)
				.then((result) => {
					resolve(result);
				})
				.catch((error) => {
					reject(error);
				});
		});
		
	}

	updateFileList() {
		
	}
	
	serialize() {

	}

	// getTaskNextJob() {
	//	 return parser.parseExpression(this.schedule).next().toString();
	// }

	// stop() {
	//	 this.task.stop();
	// }

	// destroy() {

	//	 //this.task.destroy();
		
	// }

	// changeSchedule(newSchedule) {

	//	 if(cron.validate(newSchedule)) {
	//		 this.stop();
	//		 this.schedule = newSchedule;

	//		 this.task = cron.schedule(this.schedule, this.exec);
	//	 } else {
	//		 log.error("Wrong schedule passed to change schedule!");
	//	 } 
	// }

	// changeExec(newExec) {
	//	 if(newExec) {
	//		 this.stop();
	//		 this.exec = newExec;

	//		 this.task = cron.schedule(this.schedule, this.exec);
	//	 }
	// }

	// getSimpleTime() {
	//	 let splittedSchedule = this.schedule.split(" ");
	//	 return splittedSchedule[2] + ":" + splittedSchedule[1];
	// }

}