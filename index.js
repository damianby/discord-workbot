'use strict';



global.__basedir = __dirname;
const log = require('./modules/log')("app");

const express = require('express');
const app = express();
const http = require('http');
var server = http.Server(app);

const routes = require('./routes/routes');
const manager = require('./modules/manager');
 

const discordManager = require('./modules/discordManager');

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

const db = require('./modules/db');

db.connect("workbot").then( () => {
    log.info("Connected to database workbot");
  
    //Manager.loadAllDatabases();
  

    server.listen(43000, "0.0.0.0", function(){
        log.verbose("Server started on ip 0.0.0.0:80");


        discordManager.login();

    });
}).catch( (e) => {
    console.log("Data base error on start:");
    console.log(e);
});

 
const moment = require('moment');
const https = require('https');
 



