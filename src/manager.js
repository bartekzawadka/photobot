/**
 * Created by barte_000 on 2017-07-08.
 */
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var config = require(path.join(__dirname, '..', 'config.json'));
var motorDriver = require(path.join(__dirname, 'device', 'motor'));

var Manager = (function(){
   var instance;

   function createInstance(){
       return new ManagerLogic();
   }

   return {
       getInstance: function(){
           if(!instance){
               instance = createInstance();
           }
           return instance;
       },
       initialize: function(){
           if(!instance){
               instance = createInstance();
           }
       }
   }
})();

var ManagerLogic = function(){
    var statuses = {
        READY: 0,
        BUSY: 1
    };

    var motorDriver = motorDriver.getInstance();
    var currentStatus = statuses.READY;

    let configuration = {
        stepAngle: motorDriver.getMinAngle(),
        direction: 'counter-clockwise',
        activeCamera: config.defaultCamera
    };

    ManagerLogic.prototype.getStatus = function(){
        return currentStatus;
    };

    ManagerLogic.prototype.getCameras = function(){
        let dirs = fs.readdirSync(path.join(__dirname, 'device', 'camera'))
            .filter(file=>fs.lstatSync(path.join(__dirname, 'device', 'camera', file)).isDirectory());

        let devices = [];

        _.forEach(dirs, function(dir){
            try {
                var obj = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf-8'));
                if (obj.isActive) {
                    devices.push({
                        name: obj.name,
                        description: obj.description
                    })
                }
            }
            finally {}
        });

        return devices;
    };

    ManagerLogic.prototype.setActiveCamera = function(camera){
        return null;
    };

    ManagerLogic.prototype.setConfig = function(configuration){
        this.configuration = configuration;
    };

    ManagerLogic.prototype.getConfig = function(){
        return this.configuration;
    };

    ManagerLogic.prototype.getMinStepAngle = function(){
        return motorDriver.getMinAngle();
    };

    ManagerLogic.prototype.capture = function(progressCallback, completed){
      var status = this.getStatus();
      if(status === statuses.BUSY){
          if(completed){
              completed(null, "Device is busy");
          }
          return;
      }

        var iterator = 0;
        var images = [];

        var numOfImages = Math.round(360/configuration.stepAngle);

        function rotate(){
            motorDriver.rotate(configuration.stepAngle, configuration.direction, function(e){
                if(e){
                    completed(null, e);
                    return;
                }

                //todo: take photo!

                if(progressCallback){
                    progressCallback(Math.round(iterator+1/numOfImages));
                }
                iterator++;
                if(iterator<numOfImages){
                    rotate();
                }else{
                    completed();
                }
            });
        }
        rotate();
    };

    //TODO: check if camera is OK
};

module.exports = Manager;