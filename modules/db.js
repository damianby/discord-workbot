const log = require('./log')("db");


const { MongoClient } = require("mongodb");
// Connection URI
const uri = "mongodb://127.0.0.1:27017/?poolSize=20&writeConcern=majority";

// Create a new MongoClient
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let database;
let usersColl;
let guildsColl;
let hoursColl;

async function connect() {
    try {
        // Connect the client to the server
        await client.connect();
        console.log("COnnected");
        // Establish and verify connection
        
        await client.db("workbot").command({ ping: 1 });

        database = client.db("workbot");
        console.log("Connected successfully to server");
        usersColl =  await database.collection("users");
        guildsColl = await database.collection("guilds");
        hoursColl = await database.collection("hours");
    } catch (err) {
        throw new Error(err);
    }
}

function get(){
    return database;
}

function users(){
    return usersColl;
}
function guilds(){
    return guildsColl;
}
function hours(){
    return hoursColl;
}

async function close(){
    database.close();
}

// function updateMeta(param){

//     mongodb.collection("_metadata").updateOne({name: collectionName}, param, {upsert: true}, function(err, res){
//         if(err){
//             log.error(err);
//             //throw err;
//         } 
//        log.debug("Succesfully updated metadata of " + collectionName);
//     });
// }

// function getMeta(){
//     return mongodb.collection("_metadata");
// }

module.exports = {
    connect,
    get,
    close,
    users,
    guilds,
    hours
};