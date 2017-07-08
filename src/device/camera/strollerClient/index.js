/**
 * Created by barte_000 on 2017-07-08.
 */
var http = require('http');
var path = require('path');
var config = require(path.join(__dirname, 'config.json'));

module.exports = {
  takePhoto: function(callback){

      //TODO: To be implemented
      // var options = {
      //     host: config.params.host,
      //     port: config.params.port,
      //     path: '/takePhoto',
      //     method: 'GET'
      // };
      //
      // var req = http.request(options, function(res){
      //     res.setEncoding('utf8');
      // });
      // req.end();

      callback(null);
  }
};