/**
 * Created by barte_000 on 2017-07-08.
 */
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var config = require(path.join(__dirname, '..', 'config.json'));
var motorDriver = require(path.join(__dirname, 'device', 'motor.js'));
var collUtils = require(path.join(__dirname, 'utils', 'collections.js'));

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
        READY: "ready",
        BUSY: "busy"
    };

    this.mDriver = motorDriver.getInstance();
    this.currentStatus = statuses.READY;

    this.configuration = {
        stepAngle: this.mDriver.getMinAngle(),
        direction: 'counter-clockwise',
        activeCamera: config.defaultCamera
    };

    ManagerLogic.prototype.getStatus = function(){
        return this.currentStatus;
    };

    ManagerLogic.prototype.getCameras = function(){
        var rootDir = path.join(__dirname, 'device', 'camera');

        var dirs = fs.readdirSync(rootDir)
            .filter(file=>fs.lstatSync(path.join(rootDir, file)).isDirectory());

        var devices = [];

        _.forEach(dirs, function(dir){
            try {
                var obj = JSON.parse(fs.readFileSync(path.join(rootDir, dir, 'config.json'), 'utf-8'));
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

    ManagerLogic.prototype.setConfig = function(configuration){

        if(configuration.stepAngle){
            if(configuration.stepAngle<0 || configuration.stepAngle > 360){
                throw "Invalid angle. Value must be set between 0 and 360";
            }
        }
        if(configuration.direction){
            var directions = this.mDriver.getDirections();

            if(!collUtils.checkIfHasValue(directions, configuration.direction)){
                throw  "Unknown direction '"+configuration.direction+"'";
            }
        }
        if(configuration.activeCamera){
            var cameras = this.getCameras();

            if(!collUtils.checkIfValueExists(cameras, "name", configuration.activeCamera)){
                throw "Camera '"+configuration.activeCamera+"' was not found";
            }
        }

        this.configuration = configuration;
    };

    ManagerLogic.prototype.getConfig = function(){
        return this.configuration;
    };

    ManagerLogic.prototype.getMinStepAngle = function(){
        return this.mDriver.getMinAngle();
    };

    ManagerLogic.prototype.capture = function(progressCallback, completed){
      var status = this.getStatus();
      if(status === statuses.BUSY){
          if(completed){
              completed(null, "Device is busy");
          }
          return;
      }

      this.currentStatus = statuses.BUSY;

      try {

          var iterator = 0;
          var images = [];

          var numOfImages = Math.round(360 / this.configuration.stepAngle);

          function rotate(mDriver, configuration) {
              mDriver.rotate(configuration.stepAngle, configuration.direction, function (e) {
                  if (e) {
                      completed(null, e);
                      return;
                  }

                  var inter = setInterval(function () {
                      console.log("TAKING PHOTO!");
                      clearInterval(inter);
                  }, 3000);


                  if (progressCallback) {
                      progressCallback(Math.round(iterator + 1 / numOfImages));
                  }
                  iterator++;
                  if (iterator < numOfImages) {
                      rotate(mDriver, configuration);
                  } else {
                      completed();
                  }
              });
          }

          rotate(this.mDriver, this.configuration);

      }catch (e){
          console.log("ERROR TAKING PHOTO 360: ", e);
      }finally {
          this.currentStatus = statuses.READY;
      }
    };
};

module.exports = Manager;