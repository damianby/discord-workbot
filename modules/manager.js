
const log = require('./log')('manager');

//const { v4: uuidv4 } = require('uuid');

const crypto = require('crypto');

const IP = '192.168.1.108';
const PORT = 43000;

const reports = new Map();

setInterval(function() {
	const tenMinAgo = new Date() - 1000 * 60 * 10;
	for(const [id, report] of reports.entries()) {
		if(tenMinAgo > report.date) {
			reports.delete(id);
		}
	}
}, 1000 * 60); // run every minute

exports.initialize = function() {

}

exports.getOneTimeReport = function(id) {

	if(reports.has(id)) {
		const report = reports.get(id).data;
		reports.delete(id);
		return report;
	} else {
		return null;
	}
}

exports.generateOneTimeReport = function(reportData) {
	//let uuid = uuidv4().split('-').join('');

	const id = crypto.randomBytes(64).toString('hex');

	reports.set(id, {
		data: reportData,
		date: new Date(),
	});

	return 'http://' + IP + ':' + PORT.toString() + '/report/' + id;
}
