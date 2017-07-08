/**
 * Created by barte_000 on 2017-07-05.
 */
var path = require('path');
var config = require(path.join(__dirname, '..', '..', 'config.json'));
var Gpio = require('pigpio').Gpio;


var MotorDriver = (function(){
    var instance;

    function createInstance(){
        return new Motor();
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    }
})();


var Motor = function() {

    this.directionPort = new Gpio(config.GPIO.direction, {mode: Gpio.OUTPUT});
    this.stepPort = new Gpio(config.GPIO.step, {mode: Gpio.OUTPUT});

    function getDirection(direction){
        switch (direction){
            case 'counter-clockwise':
                return 0;
            case 'clockwise':
                return 1;
            default:
                return 0;
        }
    }

    function convertAngleToSteps(angle){
        return Math.round(angle*config.motor.maxSteps/360);
    }

    Motor.prototype.rotate = function(angle, direction, callback){

        if(!angle || isNaN(angle)){
            callback("Angle is not defined");
            return;
        }

        var steps = convertAngleToSteps(angle);
        if(!steps || steps < 0)
            steps = 0;
        else if(steps > config.motor.maxSteps){
            steps = config.motor.maxSteps;
        }

        this.directionPort.digitalWrite(getDirection(direction));

        var counter = 1;

        while (counter<=steps){
            this.stepPort.digitalWrite(1);
            setInterval(function(){
                this.stepPort.digitalWrite(0);
            }, config.motor.rotationInterval);
            counter+=1;
        }

        callback();
    };

    Motor.prototype.getMinAngle = function(){
        return 360/config.motor.maxSteps;
    }
};

module.exports = MotorDriver;