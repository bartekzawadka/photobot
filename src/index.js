/**
 * Created by barte_000 on 2017-07-04.
 */
var restify = require('restify');
var path = require('path');
var config = require(path.join(__dirname, '..', 'config.json'));
var Manager = require(path.join(__dirname, 'manager.js'));
var mongoose = require('mongoose');

const restifyBodyParser = require('restify-plugins').bodyParser;


var server = restify.createServer({
    name: 'Stroller'
});

server.use(restifyBodyParser());

server.use(function crossOrigin(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", 'X-Requested-With');
    return next();
});

var io = require('socket.io')(server.server);

Manager.initialize(io);

var api = require(path.join(__dirname, 'api', 'api.js'));
api.set(server);

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://'+config.db.host+'/'+config.db.database, {
    user: config.db.username,
    pass: config.db.password
});

mongoose.connection.on('open', function(){
    console.log('[INFO] index.js Connected to mongo server.');
    server.listen(config.server.port, '0.0.0.0',function() {
        console.log('%s listening at %s', server.name, server.url);
    });
});

mongoose.connection.on('error', function(err){
    console.log('[ERROR] index.js MongoDB Connection Error. Please make sure that MongoDB is running.');
    console.log(err);
    process.exit(1);
});