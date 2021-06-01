
const log = require("./log")('manager');

const { v4: uuidv4 } = require('uuid');

const IP = "192.168.1.114";
const PORT = 43000;

let reports = {};

exports.initialize = function() {
  
}

exports.updateUsers = function(guildMembers) {

}

exports.createUser = function() {

}

exports.getOneTimeReport = function(id) {

	if(reports[id]) {
		let report = reports[id];
		delete reports[id];
		return report;
	} else {
		return null;
	}
}

exports.generateOneTimeReport = function(reportData) {
	let uuid = uuidv4().split("-").join("");

	console.log(uuid);

	reports[uuid] = reportData;

	return "http://" + IP + ":" + PORT.toString() + "/report/" + uuid;
}
