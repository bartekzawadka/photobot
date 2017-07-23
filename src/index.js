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

server.use(function crossOrigin(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", 'Authorization, Origin, Content-Type, Accept, X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET, POST');
    return next();
});

api.set(server);

Manager.initialize();

server.listen(config.server.port, '0.0.0.0',function() {
    console.log('%s listening at %s', server.name, server.url);
});