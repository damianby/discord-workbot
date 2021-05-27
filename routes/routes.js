var express = require('express');
var routes = express.Router();


let mainRoute = require('./main');
let reportRoute = require("./report");
let perforceRoute = require("./perforce");

routes.get('/', mainRoute);
routes.get('/report/:reportId', reportRoute);
routes.post('/perforce', perforceRoute);

module.exports = routes;