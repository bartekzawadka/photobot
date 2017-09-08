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

    this.m1Port = new Gpio(config.GPIO.M1, {mode: Gpio.OUTPUT});
    this.m2Port = new Gpio(config.GPIO.M2, {mode: Gpio.OUTPUT});
    this.m3Port = new Gpio(config.GPIO.M3, {mode: Gpio.OUTPUT});

    var directions = {
        CLOCKWISE: "clockwise",
        COUNTER_CLOCKWISE: "counter-clockwise"
    };

    function getDirection(direction){
        switch (direction){
            case directions.COUNTER_CLOCKWISE:
                return 0;
            case directions.CLOCKWISE:
                return 1;
            default:
                return 0;
        }
    }

    function convertAngleToSteps(angle){
        return Math.round(angle*config.motor.maxSteps*8/360);
    }

    Motor.prototype.getDirections = function(){
        return directions;
    };

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
        this.m1Port.digitalWrite(1);
        this.m2Port.digitalWrite(1);
        this.m3Port.digitalWrite(0);

        let counter = 1;

        let me = this;

        function loop(){
            if(counter<=steps){
                me.stepPort.digitalWrite(1);
                let inter = setInterval(function(){
                    me.stepPort.digitalWrite(0);
                    counter+=1;
                    clearInterval(inter);
                    loop();
                }, config.motor.rotationInterval);
            }else{
                callback();
            }
        }

        loop();
    };

    Motor.prototype.getMinAngle = function(){
        return 360/config.motor.maxSteps;
    }
};

module.exports = MotorDriver;