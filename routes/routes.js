var express = require('express');
var routes = express.Router();


let mainRoute = require('./main');
let reportRoute = require("./report");

routes.get('/', mainRoute);
routes.get('/report/:reportId', reportRoute);

module.exports = routes;