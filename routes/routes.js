var express = require('express');
var routes = express.Router();


var mainRoute = require('./main');

routes.get('/', mainRoute);

module.exports = routes;