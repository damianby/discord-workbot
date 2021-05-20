const winston = require('winston');


const levels = { 
    error: 0, 
    warn: 1, 
    info: 2, 
    verbose: 3, 
    debug: 4, 
    silly: 5 
  };


const fs = require('fs');
const path = require('path');
const logDir = 'log'; // directory path you want to set
if ( !fs.existsSync( logDir ) ) {
    // Create the directory if it does not exist
    fs.mkdirSync( logDir );
}



var highestLogPrefix = 0;



const myFormat = winston.format.printf(({ level, message, label, timestamp }) => {

    let currentLogPrefix = `[${timestamp}] [${level.toUpperCase()}]\t`;

    let stringLabel = `[${label.toUpperCase()}]`;

    let length = stringLabel.length;

    if(length > highestLogPrefix)
        highestLogPrefix = length;
    

    let stringMessage = ` : ${message}`;
    let finalLog = currentLogPrefix + stringLabel + ' '.repeat(highestLogPrefix - length) + stringMessage;
    
    return finalLog;
});




function getLogger(label){

    if(!label){
        label = "default";
    }

    if(!winston.loggers.has(label)){
        winston.loggers.add(label, {
            format: winston.format.combine(
                winston.format.label({ 
                    label: label} ),
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),

                myFormat
            ),
            defaultMeta: {service: 'user-service' },
            transports: [
                //
                // - Write to all logs with level `info` and below to `combined.log` 
                // - Write all logs error (and below) to `error.log`.
                //
                new winston.transports.Console({
                    level: 'debug'
                }),
                new winston.transports.File({ 
                    filename: path.join(logDir, '/error.log'), 
                    level: 'error',
                    maxsize: 10000000
                }),
                new winston.transports.File({ 
                    filename: path.join(logDir, '/combined.log'),
                    maxsize: 10000000
                }),
                new winston.transports.File({
                    filename: path.join(logDir, '/combined-debug.log'),
                    maxsize: 10000000,
                    level: 'debug'
                })
            ]
        });
    }
    return winston.loggers.get(label);
}

module.exports = getLogger;