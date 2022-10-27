const winston = require('winston');


const LEVELS = {
	error: 0,
	warn: 1,
	info: 2,
	http: 3,
	verbose: 4,
	debug: 5,
	silly: 6
};

const fs = require('fs');
const path = require('path');
const logDir = path.join(__dirname, 'log'); // directory path you want to set

if (!fs.existsSync(logDir)) {
	// Create the directory if it does not exist
	fs.mkdirSync(logDir);
}

let highestLogPrefix = 0;

const myFormat = winston.format.printf(({ level, message, label, timestamp }) => {

	const currentLogPrefix = `[${timestamp}] [${level.toUpperCase()}]\t`;

	const stringLabel = `[${label.toUpperCase()}]`;

	const length = stringLabel.length;

	if(length > highestLogPrefix) {
		highestLogPrefix = length;
	}

	const stringMessage = ` : ${message}`;
	const finalLog = currentLogPrefix + stringLabel + ' '.repeat(highestLogPrefix - length) + stringMessage;

	return finalLog;
});

function getLogger(label) {

	if(!label) {
		label = 'default';
	}

	if(!winston.loggers.has(label)) {
		winston.loggers.add(label, {
			format: winston.format.combine(
				winston.format.label({
					label: label }),
				winston.format.timestamp({
					format: 'YYYY-MM-DD HH:mm:ss',
				}),
				myFormat,
			),
			defaultMeta: { service: 'user-service' },
			transports: [
				//
				// - Write to all logs with level `info` and below to `combined.log` 
				// - Write all logs error (and below) to `error.log`.
				//
				new winston.transports.Console({
					level: 'verbose',
				}),
				new winston.transports.File({ 
					filename: path.join(logDir, '/error.log'),
					level: 'warn',
					maxsize: 10000000,
				}),
				new winston.transports.File({ 
					filename: path.join(logDir, '/combined.log'),
					maxsize: 10000000,
				}),
				new winston.transports.File({
					filename: path.join(logDir, '/combined-debug.log'),
					maxsize: 10000000,
					level: 'debug',
				}),
			],
		});
	}
	return winston.loggers.get(label);
}

module.exports = getLogger;