const log = require("./log")('discord-manager');

const db = require('./db');

// Import the discord.js module
const Discord = require('discord.js');

// Create an instance of a Discord client
const client = new Discord.Client();

let bIsReady = false;

const LISTEN_CHANNEL_NAME = "test";
let ListenChannel = null;

exports.login = async function() {
    client.login( "ODQ0OTU5OTE1NTg3Nzk3MDY1.YKaAPg.XcA-_KDI6KCrngFVVQLprnBxOqc" )
        .then( (token) => {
            console.log("Logged in as bot");
        }).catch( (e) => {
            throw new Error(e)
        });
}

exports.getMembers = async function() {


}

exports.getChannels = async function() {
    //client.channels.fetch().
}
/**
 * The ready event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Discord
 */
client.on('ready', () => {
    bIsReady = true;
    log.info('I am ready!');

    let channels = client.channels.cache;

    channels.forEach(channel => {
        if(channel.name == LISTEN_CHANNEL_NAME) {
            ListenChannel = channel;
            log.info("Listen channel " + LISTEN_CHANNEL_NAME + " found!");
        }
    });

    // let members = testChannel.members;


    // for (let [snowflake, guildMember] of members) {   
    //     console.log('snowflake: ' + snowflake);   
    //     console.log('id: ' + guildMember.id);  
    //     console.log('user id: ' + guildMember.user.id);
    // }

    let usersToFind = [];

    for (const [snowflake, member] of ListenChannel.members) {
        //console.log(snowflake, member);
        //console.log(member.user.username);

        if(member.user.id == client.user.id) {
            continue;
        }

        usersToFind.push(snowflake);


        const updateDoc = {
            $set: {
              id: snowflake,
              name: member.user.username,
            }
          };

        db.coll().updateOne({id: snowflake}, updateDoc, {upsert: true});
        // usersData.push({
        //     id: member.user.id,
        //     isActive: false,
        //     name: member.user.username
        // });
    }

    

    //console.log(testChannel.members);
    // .then((members) => {
    //     //console.log(members);
    //     for(let member of members) {
    //         console.log(member);
    //     }
    //     console.log("FETCHED");
    // })
    // .catch((error) => {
    //     console.log(error);
    //     console.log("ERROR");
    // });

    console.log("adada");
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
