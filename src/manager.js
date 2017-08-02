/**
 * Created by barte_000 on 2017-07-08.
 */
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var config = require(path.join(__dirname, '..', 'config.json'));
var motorDriver = require(path.join(__dirname, 'device', 'motor.js'));
var collUtils = require(path.join(__dirname, 'utils', 'collections.js'));
var uuidUtils = require(path.join(__dirname, 'utils', 'uuid.js'));

let socket = undefined;

var Manager = (function () {
    var instance;

    function createInstance() {
        return new ManagerLogic();
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        },
        initialize: function (socketIo) {

            socket = socketIo;

            if (!instance) {
                instance = createInstance();
            }
        }
    }
})();

var ManagerLogic = function () {

    // if(!socket){
    //     throw "Manager was not initialized. Socket.IO not instantiated";
    // }
    //this.socket = socket;

    this.socketClient = undefined;

    let statuses = {
        READY: "ready",
        BUSY: "busy"
    };

    let acquisitionStatuses = {
        FINISHED: 0,
        TAKE_PHOTO: 1
    };

    this.mDriver = motorDriver.getInstance();
    this.currentStatus = statuses.READY;


    // socket.on('disconnected', function(kk){
    //    console.log('SOCKET DISCONNECTED: '+kk.id);
    // });

    this.getDefaultConfiguration = function () {
        return {
            stepAngle: this.mDriver.getMinAngle() * 4,
            direction: 'counter-clockwise',
            activeCamera: config.defaultCamera
        }
    };

    this.initializeAcquisitionData = function () {
        this.acquisitionData = {
            imageIndex: 0,
            numOfImages: (this.configuration.stepAngle && this.configuration.stepAngle > 0)
                ? Math.round(360 / this.configuration.stepAngle)
                : 0,
            images: [],
            token: undefined
        };
    };

    this.configuration = this.getDefaultConfiguration();
    this.initializeAcquisitionData();

    ManagerLogic.prototype.getStatus = function () {
        return this.currentStatus;
    };

    ManagerLogic.prototype.getCameras = function () {
        var rootDir = path.join(__dirname, 'device', 'camera');

        var dirs = fs.readdirSync(rootDir)
            .filter(file => fs.lstatSync(path.join(rootDir, file)).isDirectory());

        var devices = [];

        _.forEach(dirs, function (dir) {
            try {
                var obj = JSON.parse(fs.readFileSync(path.join(rootDir, dir, 'config.json'), 'utf-8'));
                if (obj.isActive) {
                    devices.push({
                        name: obj.name,
                        description: obj.description
                    })
                }
            }
            finally {
            }
        });

        return devices;
    };

    ManagerLogic.prototype.setConfig = function (configuration) {

        if (!configuration || _.isEmpty(configuration)) {
            return;
        }

        if (configuration.stepAngle && _.isNumber(configuration.stepAngle)) {
            if (configuration.stepAngle < 0 || configuration.stepAngle > 360) {
                throw "Invalid angle. Value must be set between 0 and 360";
            }
        }
        if (configuration.direction) {
            var directions = this.mDriver.getDirections();

            if (!collUtils.checkIfHasValue(directions, configuration.direction)) {
                throw  "Unknown direction '" + configuration.direction + "'";
            }
        }
        if (configuration.activeCamera) {
            var cameras = this.getCameras();

            if (!collUtils.checkIfValueExists(cameras, "name", configuration.activeCamera)) {
                throw "Camera '" + configuration.activeCamera + "' was not found";
            }
        }

        this.configuration = configuration;
    };

    ManagerLogic.prototype.getConfig = function () {
        return this.configuration;
    };

    ManagerLogic.prototype.getMinStepAngle = function () {
        return this.mDriver.getMinAngle();
    };

    ManagerLogic.prototype.setDefaultConfig = function () {
        this.configuration = this.getDefaultConfiguration();
    };

    ManagerLogic.prototype.getDirections = function () {
        let directions = [];
        directions.push({name: 'Counter-clockwise', value: 'counter-clockwise'});
        directions.push({name: 'Clockwise', value: 'clockwise'});
        return directions;
    };

    ManagerLogic.prototype.acquisitionCancel = function (token) {
        if (!token || this.acquisitionData.token !== token) {
            throw "Invalid token";
        }

        this.initializeAcquisitionData();
        this.currentStatus = statuses.READY;
    };

    ManagerLogic.prototype.appendImageAndRotate = function (token, image, completed, failed) {
        if (this.getStatus() !== statuses.BUSY) {
            failed("Device is not capturing. Unexpected data");
            return;
        }

        if (!token || this.acquisitionData.token !== token) {
            failed("Invalid token");
            return;
        }

        if (!image || image.length <= 0) {
            failed("Empty image data");
            return;
        }

        this.acquisitionData.images.push({
            index: this.acquisitionData.imageIndex,
            image: image
        });

        this.acquisitionData.imageIndex = this.acquisitionData.imageIndex + 1;

        let progress = Math.round((this.acquisitionData.imageIndex) * 100 / this.acquisitionData.numOfImages);
        let me = this;

        if (this.acquisitionData.imageIndex < this.acquisitionData.numOfImages) {
            this.mDriver.rotate(this.configuration.stepAngle, this.configuration.direction, function (e) {
                if (e) {
                    me.initializeAcquisitionData();
                    me.currentStatus = statuses.READY;
                    failed("Unable to rotate platform. Capturing failed: " + e);
                    return;
                }

                completed({
                    status: acquisitionStatuses.TAKE_PHOTO,
                    progress: progress
                });

            });
        } else {

            // TODO: STORE TOTAL IMAGE!!!

            completed({
                status: acquisitionStatuses.FINISHED,
                progress: progress
            });

            me.initializeAcquisitionData();
            me.currentStatus = statuses.READY;
        }

    };

    ManagerLogic.prototype.acquisitionInit = function () {
        let status = this.getStatus();
        if (status === statuses.BUSY) {
            throw "Device is busy";
        }

        this.currentStatus = statuses.BUSY;

        this.initializeAcquisitionData();
        this.acquisitionData.token = uuidUtils.generateGuid();
        return this.acquisitionData.token;
    };

    // OLD
    /*
    ManagerLogic.prototype.capture2 = function (progressCallback, completed) {
        var status = this.getStatus();
        if (status === statuses.BUSY) {
            if (completed) {
                completed(null, "Device is busy");
            }
            return;
        }

        this.currentStatus = statuses.BUSY;

        completed();

        try {

            var me = this;


            var socketConnected = function (sss) {

                var iterator = 0;
                var images = [];

                var numOfImages = Math.round(360 / me.configuration.stepAngle);

                sss.emit('capturing started', {});


                let capturedListener = function (data) {

                    // STORE DATA USING ITERATOR AS INDEX

                    sss.emit('progress', Math.round((iterator + 1) * 100 / numOfImages));
                    iterator++;
                    if (iterator < numOfImages) {
                        rotate(me.mDriver, me.configuration, sss);
                        //iterator++;
                    } else {
                        sss.emit('capturing completed');
                        sss.removeListener('captured', capturedListener);
                        sss.disconnect();
                        //sss.conn.disconnect();
                        sss.removeListener('connection', socketConnected);
                    }
                };


                function rotate(mDriver, configuration, k) {
                    mDriver.rotate(configuration.stepAngle, configuration.direction, function (e) {
                        if (e) {
                            //completed(null, e);
                            sss.emit('capturing failed', e);
                            sss.removeListener('captured', capturedListener);
                            sss.disconnect();
                            //sss.conn.disconnect();
                            sss.removeListener('connection', socketConnected);
                            return;
                        }

                        console.log("WAITING FOR PHOTO!");
                        k.emit('capture');
                    });
                }

                sss.on('captured', capturedListener);

                rotate(me.mDriver, me.configuration, sss);
            };


            socket.once('connection', socketConnected);
            socket.on('close', function (sss) {
                sss.disconnect();
                sss.removeListener('connection', socketConnected);
            });

        } catch (e) {
            console.log("ERROR TAKING PHOTO 360: ", e);
        } finally {
            this.currentStatus = statuses.READY;
        }
    };
    */
};

module.exports = Manager;