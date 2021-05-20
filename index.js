'use strict';



global.__basedir = __dirname;
const log = require('./modules/log')("app");

const express = require('express');
const app = express();
const http = require('http');
var server = http.Server(app);

const routes = require('./routes/routes');
const manager = require('./modules/manager');
 
app.use(express.json({
    inflate: true,
    limit: '100kb',
    reviver: null,
    strict: true,
    type: 'application/json',
    verify: undefined
}));

app.set('views', __basedir + '\\Public');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

 
app.use('/', routes);
app.use(express.static(__basedir + '/Public'));


manager.initialize();

server.listen(43000, "0.0.0.0", function(){
    log.verbose("Server started on ip 0.0.0.0:80");
});
 
const moment = require('moment');
const https = require('https');
 

// Import the discord.js module
const Discord = require('discord.js');

// Create an instance of a Discord client
const client = new Discord.Client();



/**
 * User
 * {
 *  isActive,
 *  day,
 *  dateStart, //might be null
 *  dateEnd, //might be null
 *  name,
 *  
 * }
 */
//check if group is worker 
let usersData = [

]



/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */
client.on('ready', () => {
    console.log('I am ready!');
    let channels = client.channels.cache;
    //console.log(channels);
    let testChannel = null;

    channels.forEach(channel => {
        if(channel.name == "test") {
            testChannel = channel;
        }
    });

    console.log(testChannel);
    // testChannel.guild.fetchMembers().then(r => {
    //     r.members.array().forEach(member => {
    //         console.log(member);
    //     });
    // });

    // if(testChannel) {
    //     testChannel.guild.members.cache.forEach(member => {
    //         console.log(member);
    //     });
    // }

    client.user.setActivity("Harry Potter", { type: "WATCHING"});

    //console.log(testChannel);
});

// Create an event listener for messages
client.on('message', message => {

    let prefix = "/";

  // If the message is "ping"
  if (message.content === prefix + 'hello') {
    // Send "pong" to the same channel
    let date = moment().locale('pl').format('llll');
    message.channel.send(date);

   
    https.get('https://random.dog/woof.json', (resp) => {
        let data = '';

        // A chunk of data has been received.
        resp.on('data', (chunk) => {
            data += chunk;
        });
    
        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            console.log(JSON.parse(data));

            data = JSON.parse(data);
            //console.log(message);
            if(data.url) {
                console.log("Sending dog");

                const attachment = new Discord.MessageAttachment(data.url);
                message.author.send("Random DOG", attachment);
            }
        }); 
    }).on("error", (err) => {
        console.log("Error: " + err.message);
    });





    //
  }
});
client.login( "ODQ0OTU5OTE1NTg3Nzk3MDY1.YKaAPg.XcA-_KDI6KCrngFVVQLprnBxOqc" );