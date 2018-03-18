/**
 * Created by barte_000 on 2017-07-04.
 */
let restify = require('restify');
let path = require('path');
let config = require(path.join(__dirname, '..', 'config.json'));
let Manager = require(path.join(__dirname, 'manager.js'));
let models = require(path.join(__dirname,'models'));

const restifyBodyParser = require('restify-plugins').bodyParser;


let server = restify.createServer({
    name: 'Stroller'
});

let crossOrigin = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, TRACE, HEAD");
    res.header("Access-Control-Allow-Headers",
        'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Content-Length, Content-Disposition, Origin');
    res.header("Access-Control-Expose-Headers", "Content-Disposition, Content-Length, Content-Type");

    return next();
};

let optionsHandler = function (req, res, next) {
    res.send(200);
    return next();
};

server.use(crossOrigin);
server.opts('/\.*/', optionsHandler);

server.use(restifyBodyParser());

Manager.initialize();

let api = require(path.join(__dirname, 'api', 'api.js'));
api.set(server);

models.sequelize.sync().then(function () {
    console.log('[INFO] index.js Connected to database server.');
    server.listen(config.server.port, '0.0.0.0', function () {
        console.log('%s listening at %s', server.name, server.url);
    });
}).catch(function (err) {
    console.log('[ERROR] index.js Database Connection Error. Please check database logs.');
    console.log(err);
    process.exit(1);
});