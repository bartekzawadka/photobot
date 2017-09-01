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
let dateUtils = require(path.join(__dirname, 'utils', 'date.js'));
let Image = require(path.join(__dirname, 'models', 'image'));
let Chunk = require(path.join(__dirname, 'models', 'chunk'));
let imageUtils = require(path.join(__dirname, 'utils', 'image.js'));
let promisesUtils = require(path.join(__dirname, 'utils', 'promises.js'));

var Manager = (function () {
    var instance;

    function createInstance() {
        return new ManagerLogic();
    }

    return {
        getInstance: function () {
            if (!instance) {
                this.initialize();
            }
            return instance;
        },
        initialize: function () {
            if (!instance) {
                instance = createInstance();
            }
        }
    }
})();

var ManagerLogic = function () {

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

    this.getDefaultConfiguration = function () {
        return {
            stepAngle: this.mDriver.getMinAngle(),
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
            chunks: [],
            token: undefined
        };
    };

    this.configuration = this.getDefaultConfiguration();
    this.initializeAcquisitionData();

    if (!config.imageStorageDirectory) {
        throw "Stroller misconfiguration. Storage directory was not set";
    }

    if (!fs.existsSync(config.imageStorageDirectory)) {
        fs.mkdirSync(config.imageStorageDirectory);
    }

    this.storeImage = function (imagesCollection) {
        let me = this;

        return new Promise(function (resolve, reject) {

            if (!me.acquisitionData.token) {
                throw "Image store failed. Invalid token";
            }

            if (!me.acquisitionData.chunks) {
                throw "No data to be stored. Image set is empty";
            }

            let imagesArray = [];
            _.forEach(imagesCollection, function (item) {
                imagesArray.push(item.image);
            });

            imageUtils.get360ImageThumbnail(imagesArray, 100).then(function (thumbnail) {

                let definitionObject = [];

                promisesUtils.processPromisesArray(imagesCollection, function (chunk) {
                    return new Promise(function (resolve, reject) {
                        Chunk.create({
                            index: chunk.index,
                            image: chunk.image
                        }, function (error, data) {
                            if (error) {
                                reject(error);
                            } else {
                                definitionObject.push({
                                    index: data.index,
                                    id: data._id
                                });
                                resolve();
                            }
                        });
                    });
                }).then(function () {
                    let ids = [];

                    definitionObject = _.sortBy(definitionObject, 'index');
                    _.forEach(definitionObject, function (item) {
                        ids.push(item.id);
                    });

                    Image.create({
                        thumbnail: thumbnail,
                        chunks: ids
                    }, function (error, result) {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                }).catch(function (error) {
                    reject(error);
                });
            }, function (error) {
                reject(error);
            });
        });
    };

    ManagerLogic.prototype.getImage = function (id) {

        //TODO: Refactor to return list of chunks and add getChunk function
        return new Promise(function (resolve, reject) {
            if (!id) {
                reject("Image ID was not provided");
                return;
            }

            Image.findById(id).exec(function (error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    };

    ManagerLogic.prototype.getChunk = function (id) {
        return new Promise(function (resolve, reject) {
            if (!id) {
                reject("Chunk ID was not provided");
                return;
            }

            Chunk.findById(id).exec(function(error, result){
               if(error){
                   reject(error);
               } else{
                   resolve(result);
               }
            });
        })
    };

    ManagerLogic.prototype.getImages = function () {
        return new Promise(function (resolve, reject) {
            Image.find({}).select('_id thumbnail createdAt').sort('createdAt DESC').exec(function (error, result) {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    };

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

    ManagerLogic.prototype.acquisitionCancel = function (token, force) {

        if (!force) {
            if (!token || this.acquisitionData.token !== token) {
                throw "Invalid token";
            }
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

        this.acquisitionData.chunks.push({
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

            try {

                this.storeImage(this.acquisitionData.chunks).then(function (data) {
                    completed({
                        status: acquisitionStatuses.FINISHED,
                        progress: progress,
                    });
                }).catch(function (error) {
                    failed(error);
                });

            } catch (e) {
                failed(e);
            }

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
};

module.exports = Manager;