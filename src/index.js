/**
 * Created by barte_000 on 2017-07-04.
 */
var restify = require('restify');
const restifyBodyParser = require('restify-plugins').bodyParser;


var server = restify.createServer({
    name: 'Stroller'
});

server.use(restifyBodyParser());
server.listen(4000, function() {
    console.log('%s listening at %s', server.name, server.url);
});