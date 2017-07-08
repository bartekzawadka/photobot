/**
 * Created by barte_000 on 2017-07-08.
 */
module.exports = {
    set: function(server){

        var prefix = '/api';

        server.get(prefix+'/capture', function(req, res, next){
            return res.send({"message": "NOT IMPLEMENTED"});
        });

        server.post(prefix+'/configure', function(req, res, next){
            return res.send({"message": "NOT IMPLEMENTED"});
        });
    }
};