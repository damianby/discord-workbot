const log = require("./log")('discord-manager');

const db = require('./db');


const { parse } =  require("discord-command-parser");
 
const moment = require('moment');
const https = require('https');
 


// Import the discord.js module
const Discord = require('discord.js');

// Create an instance of a Discord client
const client = new Discord.Client();

let bIsReady = false;

const WORK_CHANNEL_NAME = "workhours";


let privilegesLevels = [
    ["in", "out"],
    [],
    []
];

//update privileges for all levels
(function(){
    for(let i = 1 ; i < privilegesLevels.length ; i++) {
        privilegesLevels[i].push(...privilegesLevels[i - 1]);
    }
})();




let guildsContainer = {};

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

client.on('ready', async () => {
    bIsReady = true;
    log.info('I am ready!');

    let guilds = client.guilds.cache;

    //for (const [snowflake, member] of ListenChannel.members) {


    for (const [snowflake, guild] of guilds) {
       
        log.info("Guild " + guild.name);

        if(guild.name === "FFS") {
            continue;
        }

        let newGuild = {};
    
        let channels = guild.channels.cache;
        
        
        channels.forEach(channel => {
            if(channel.name == WORK_CHANNEL_NAME) {
                newGuild.workChannel = channel;
                
                log.info("Work channel " + WORK_CHANNEL_NAME + " found on server " + guild.name);
            }
            // If we find more than one then what? Remove and leave only one?
            //If not we should create one!
        });

        if(!newGuild.workChannel) {
            log.error("Guild " + guild.name + " missing channel " + WORK_CHANNEL_NAME);
            continue;
        }

        let clearChannel = async function() {
            let deleted = await newGuild.workChannel.bulkDelete(100)
                .catch( error => {
                    log.error("Error clearing channel " + error);
                });

            return deleted.size;
        }

        let messagesDeleted = 0;
        messagesDeleted = await clearChannel();

        newGuild.users = [];
        newGuild.activeUsers = [];
        for (const [snowflake, member] of newGuild.workChannel.members) {
            
            //Skip bot
            if(member.user.id == client.user.id) {
                continue;
            }
            const updateDoc = {
                $set: {
                  id: snowflake,
                  name: member.user.username,
                },
                $addToSet: { 
                    guilds: guild.id
                },
                $setOnInsert: {
                    privilegeLevel: 0,
                    activeScheduleId: null
                }
            };
    
            newGuild.users.push({name: member.user.username, activeScheduleId: null});
            db.users().updateOne({id: snowflake}, updateDoc, {upsert: true});
        }



        const guildDoc = {
            $set: {
              id: guild.id,
              name: guild.name,
            }
        };

        db.guilds().updateOne({id: guild.id}, guildDoc, {upsert: true});


        let hoursMsg = "";

        newGuild.users.push({name: "Uzyszkodnik123"});
        newGuild.users.push({name: "krotki"});
        

        let longestUsername = 0;
        for(let i = 0 ; i < newGuild.users.length ; i++) {
            let newUsernameLength = newGuild.users[i].name.length; 
            if(newUsernameLength > longestUsername) {
                longestUsername = newUsernameLength;
            }
        }

        for(let i = 0 ; i < newGuild.users.length ; i++) {
            let usernameLength = newGuild.users[i].name.length;
            let dif = longestUsername - usernameLength;
            if(dif > 0) {
                newGuild.users[i].name += " ".repeat(dif);
            }
        }




        for(let i = 0 ; i < newGuild.users.length ; i++) {
            hoursMsg += "```md\n" + (i+1) + '. [' + newGuild.users[i].name + "   od godziny";

            hoursMsg += "```";
        }


        newGuild.workChannel.send(hoursMsg)
        .then( message => {
            newGuild.hoursDisplayMsg = message;
        }).catch( e => {
            console.log(e);
        });

        guildsContainer[guild.name] = newGuild;
    };

    client.user.setActivity("Harry Potter", { type: "WATCHING"});
});


const dispatch = (function() {
    const dispatcher = {
        in : inMessage,
        out: outMessage
    }

    return async function(parsed, message) {
        if(dispatcher[parsed.command]) {
            await dispatcher[parsed.command](parsed, message);
        } else {
            throw new Error("unknown command");
        }
    }
})();

/**
 *  hours schema {
 *      userId: 
 *      guildId:
 *      dateStart: 
 * 
 * }
 * 
 */

async function inMessage(parsed, message) {

    if(!message.guild) {
        message.reply("Wybacz ale nie robie takich rzeczy prywatnie, tylko workhours! ;)");
        return;
    }

    globalMsg.edit("user changed to " + message.client.user.username);

    const query = {
        
    }

    db.hours().findOne(query)


    // const updateDoc = {
    //     $set: {
    //       id: snowflake,
    //       name: member.user.username,
    //     },
    //     $addToSet: { 
    //         guilds: guild.id
    //     },
    //     $setOnInsert: {
    //         privilegeLevel: 0,
    //         isActive: false
    //     }
    //   };

    // db.users().updateOne({id: snowflake}, updateDoc, {upsert: true});
    let date = moment().locale('pl').format('llll');
    message.channel.send("Uzytkownik " + message.client.user.username + " zalogowal sie o " + date);

    message.delete({timeout: 5000});
   
    // message.reply(date);
    // message.react('😉');
}

async function outMessage(parsed, message) {

}

client.on('rateLimit', info => {
    console.log("RATE LIMIT!");
    log.info(JSON.stringify(info));
});


// Create an event listener for messages
client.on('message', message => {

    let parsed = parse(message, "/", { allowSpaceBeforeCommand: true });

    if(!parsed.success) return;

    parsed.command = parsed.command.toLowerCase();

    

    dispatch(parsed, message)
        .then( () => {

        }).catch( (error) => {
            log.error("Dispatch error " + error);
        });


    
//     let prefix = "/";
//   // If the message is "ping"
//      if (message.content === prefix + 'hello') {
//         // Send "pong" to the same channel
//         let date = moment().locale('pl').format('llll');
//         message.reply(date);
//         message.react('😉');

    

   
//     // https.get('https://random.dog/woof.json', (resp) => {
//     //     let data = '';

//     //     // A chunk of data has been received.
//     //     resp.on('data', (chunk) => {
//     //         data += chunk;
//     //     });
    
//     //     // The whole response has been received. Print out the result.
//     //     resp.on('end', () => {
//     //         console.log(JSON.parse(data));

//     //         data = JSON.parse(data);
//     //         //console.log(message);
//     //         if(data.url) {
//     //             console.log("Sending dog");

//     //             const attachment = new Discord.MessageAttachment(data.url);
//     //             message.author.send("Random DOG", attachment);
//     //         }
//     //     }); 
//     // }).on("error", (err) => {
//     //     console.log("Error: " + err.message);
//     // });





//     //
//     }
});



/**
 * Indents the given string
 * @param {string} str  The string to be indented.
 * @param {number} numOfIndents  The amount of indentations to place at the
 *     beginning of each line of the string.
 * @param {number=} opt_spacesPerIndent  Optional.  If specified, this should be
 *     the number of spaces to be used for each tab that would ordinarily be
 *     used to indent the text.  These amount of spaces will also be used to
 *     replace any tab characters that already exist within the string.
 * @return {string}  The new string with each line beginning with the desired
 *     amount of indentation.
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