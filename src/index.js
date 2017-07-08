/**
 * Created by barte_000 on 2017-07-04.
 */
var restify = require('restify');
var path = require('path');
var config = require(path.join(__dirname, '..', 'config.json'));
var api = require(path.join(__dirname, 'api', 'api.js'));
var Manager = require(path.join(__dirname, 'manager.js'));

const restifyBodyParser = require('restify-plugins').bodyParser;


var server = restify.createServer({
    name: 'Stroller'
});

server.use(restifyBodyParser());

api.set(server);

Manager.initialize();

server.listen(config.server.port, function() {
    console.log('%s listening at %s', server.name, server.url);
});