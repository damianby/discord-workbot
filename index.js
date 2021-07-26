'use strict';

global.__basedir = __dirname;
console.log(global.__basedir);
const log = require('./modules/log')("app");

const express = require('express');
const app = express();
const http = require('http');
var server = http.Server(app);

var path = require('path');

const routes = require('./routes/routes');
const manager = require('./modules/manager');
 
// const sass = require('node-sass-middleware');

const discordManager = require('./modules/discordManager');

app.use(express.json({
    inflate: true,
    limit: '100kb',
    reviver: null,
    strict: true,
    type: 'application/json',
    verify: undefined
}));



// app.use(
//     sass({
//         src: path.join(__dirname, 'sass'), //where the sass files are 
//         dest: path.join(__dirname, 'public', 'css'), //where css should go
//         debug: true, // obvious,
//         prefix: '/css'
//     })
// );

app.set('views', path.join(__basedir, 'Public'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

 
app.use('/', routes);
app.use(express.static(path.join(__basedir, 'Public')));


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
    log.error("Data base error on start:");
    log.error(e);
});


