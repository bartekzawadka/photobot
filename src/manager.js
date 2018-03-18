/**
 * Created by barte_000 on 2017-07-08.
 */
let fs = require('fs');
let _ = require('lodash');
let path = require('path');
let config = require(path.join(__dirname, '..', 'config.json'));
let motorDriver = require(path.join(__dirname, 'device', 'motor.js'));
let collUtils = require(path.join(__dirname, 'utils', 'collections.js'));
let uuidUtils = require(path.join(__dirname, 'utils', 'uuid.js'));
let models = require(path.join(__dirname, 'models'));
let imageUtils = require(path.join(__dirname, 'utils', 'image.js'));
let promisesUtils = require(path.join(__dirname, 'utils', 'promises.js'));
let fsUtils = require(path.join(__dirname, 'utils', 'fs.js'));
let CameraController = require(path.join(__dirname, 'device', 'cameraController.js'));

let Manager = (function () {
    let instance;

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

let ManagerLogic = function () {

        let statuses = {
            READY: "ready",
            BUSY: "busy"
        };

        let acquisitionStatuses = {
            FINISHED: 0,
            TAKE_PHOTO: 1
        };

        this.mDriver = motorDriver.getInstance();
        this.currentStatus = statuses.BUSY;
        this.cameraController = new CameraController();

        this.getDefaultConfiguration = function () {
            let me = this;
            return new Promise(resolve => {
                this.cameraController.getCameras().then(function (cameras) {
                    resolve({
                        stepAngle: me.mDriver.getMinAngle(),
                        direction: 'counter-clockwise',
                        cameras: cameras,
                        camera: ''
                    });
                })
            });
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

            if (fs.existsSync(config.imageStorageDirectory)) {
                fsUtils.clearDirectory(config.imageStorageDirectory);
            }
        };

        let me = this;

        this.getDefaultConfiguration().then(function (conf) {
            me.configuration = conf;
            me.initializeAcquisitionData();
            me.currentStatus = statuses.READY;
        });

        if (!config.imageStorageDirectory) {
            throw "Stroller misconfiguration. Storage directory was not set";
        }

        if (!fs.existsSync(config.imageStorageDirectory)) {
            fs.mkdirSync(config.imageStorageDirectory);
        }

        me.storeImage = function (imagesCollection) {
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

                imageUtils.get360ImageThumbnail(imagesArray, config.thumbnailWidth).then(function (thumbnail) {

                    models.Image.create({
                        thumbnail: thumbnail
                    }).then(newImage => {

                        let imageId = newImage.id;

                        try{

                        promisesUtils.processPromisesArray(imagesCollection, function (chunk) {
                            return new Promise(function (resolve, reject) {

                                //let imageData = imageUtils.getFileAsBase64(chunk.image);

                                // TODO: Implement new model
                                models.Chunk.create({
                                    index: chunk.index,
                                    data: fs.readFileSync(chunk.image),
                                    imageId: imageId
                                }).then(data => {
                                    // definitionObject.push({
                                    //     index: data.index,
                                    //     id: data.id
                                    // });
                                    resolve();
                                }).catch(error => {
                                    newImage.destroy();
                                    reject(error);
                                });
                            });
                        }).then(function () {
                            resolve(imageId);
                        }).catch(function (error) {
                            newImage.destroy();
                            reject(error);
                        });
                    }
                    catch (eeee){
                            reject(eeee);
                            console.log(eeee)
                    }

                    }).catch(error => {
                        reject(error);
                    });
                }, function (error) {
                    reject(error);
                });
            });
        };

        ManagerLogic.prototype.deleteImage = function (id) {
            return new Promise(function (resolve, reject) {
                if (!id) {
                    reject("Image ID was not provided");
                    return;
                }

                models.Image.findById(id).then(img => {
                    img.destroy();
                    resolve();
                }, e => reject(e));
            });
        };

        ManagerLogic.prototype.getImage = function (id) {

            return new Promise(function (resolve, reject) {
                    if (!id) {
                        reject("Image ID was not provided");
                        return;
                    }

                    models.Image.findOne({
                        where: {
                            id: id
                        },
                        attributes: ['id', 'thumbnail', 'createdAt'],
                        include: [
                            {
                                model: models.Chunk,
                                as: 'chunks',
                                attributes: ['id']
                            }
                        ]
                    }).then(r=>{
                        resolve(r);
                    }, e => {
                        reject(e);
                    });
                }
            );
        }
        ;

        ManagerLogic.prototype.getChunk = function (id) {
            return new Promise(function (resolve, reject) {
                if (!id) {
                    reject("Chunk ID was not provided");
                    return;
                }

                // TODO: Implement new model
                models.Chunk.findById(id).then((chu) => {

                    resolve({
                        index: chu.index,
                        _id: chu.id,
                        image: "data:image/jpeg;base64,"+new Buffer(chu.data).toString('base64')
                    })
                }, reject);
            })
        };

        ManagerLogic.prototype.getImages = function () {
            return new Promise(function (resolve, reject) {

                // TODO: Implement new model
                models.Image.findAll({
                    attributes: ['id', 'thumbnail', 'createdAt'],
                    order: [['createdAt', 'DESC']]
                }).then(resolve, reject);
            });
        };

        ManagerLogic.prototype.getStatus = function () {
            return this.currentStatus;
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
                let directions = this.mDriver.getDirections();

                if (!collUtils.checkIfHasValue(directions, configuration.direction)) {
                    throw  "Unknown direction '" + configuration.direction + "'";
                }
            }

            configuration.cameras = me.configuration.cameras;
            if (configuration.camera && this.configuration.cameras) {
                if (!_.includes(this.configuration.cameras, configuration.camera)) {
                    throw "Invalid camera name. Camera '" + configuration.camera + "' is not available";
                }
            }

            this.configuration = configuration;
        };

        ManagerLogic.prototype.getConfig = function () {
            let me = this;
            return new Promise((resolve, reject) => {
                me.cameraController.getCameras().then(function (cameras) {
                    if (!cameras || cameras.length === 0) {
                        me.configuration.cameras = [];
                        me.configuration.camera = '';
                        resolve(me.configuration);
                        return;
                    } else if (me.configuration.camera && !_.includes(cameras, me.configuration.camera)) {
                        me.configuration.camera = '';
                    }
                    me.configuration.cameras = cameras;
                    resolve(me.configuration);
                }, function (error) {
                    reject(error);
                });
            });
        };

        ManagerLogic.prototype.getMinStepAngle = function () {
            return this.mDriver.getMinAngle();
        };

        ManagerLogic.prototype.setDefaultConfig = function () {
            let me = this;
            return new Promise(resolve => {
                me.getDefaultConfiguration().then(function (conf) {
                    me.configuration = conf;
                    resolve();
                });
            });
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

        ManagerLogic.prototype.appendImageAndRotate = function (token) {
            let me = this;

            return new Promise((resolve, reject) => {

                if (me.getStatus() !== statuses.BUSY) {
                    reject("Device is not capturing. Unexpected data");
                    return;
                }

                if (!token || me.acquisitionData.token !== token) {
                    reject("Invalid token");
                    return;
                }

                if ((!me.configuration.camera || me.configuration.camera === '')) {
                    reject("Empty image data");
                    return;
                }

                me.cameraController.capture(me.configuration.camera, me.acquisitionData.imageIndex).then(function () {
                    pushAndRotate(resolve, reject);
                }, function (error) {
                    reject(error);
                });
            });
        };

        function pushAndRotate(resolve, reject) {
            me.acquisitionData.chunks.push({
                index: me.acquisitionData.imageIndex,
                image: path.join(config.imageStorageDirectory, 'image_' + me.acquisitionData.imageIndex + '.jpg')
            });

            me.acquisitionData.imageIndex = me.acquisitionData.imageIndex + 1;

            let progress = Math.round((me.acquisitionData.imageIndex) * 100 / me.acquisitionData.numOfImages);

            if (me.acquisitionData.imageIndex < me.acquisitionData.numOfImages) {
                me.mDriver.rotate(me.configuration.stepAngle, me.configuration.direction, function (e) {
                    if (e) {
                        me.initializeAcquisitionData();
                        me.currentStatus = statuses.READY;
                        reject("Unable to rotate platform. Capturing failed: " + e);
                        return;
                    }

                    resolve({
                        status: acquisitionStatuses.TAKE_PHOTO,
                        progress: progress
                    });

                });
            } else {

                try {

                    me.storeImage(me.acquisitionData.chunks).then(function (data) {
                        resolve({
                            status: acquisitionStatuses.FINISHED,
                            progress: progress,
                            id: data
                        });
                        me.initializeAcquisitionData();
                        me.currentStatus = statuses.READY;
                    }).catch(function (error) {
                        me.initializeAcquisitionData();
                        me.currentStatus = statuses.READY;
                        reject(error);
                    });

                } catch (e) {
                    me.initializeAcquisitionData();
                    me.currentStatus = statuses.READY;
                    reject(e);
                }
            }
        }

        ManagerLogic.prototype.acquisitionInit = function () {
            let me = this;
            return new Promise(function (resolve, reject) {
                let status = me.getStatus();
                if (status === statuses.BUSY) {
                    reject("Device is busy");
                    return;
                }

                me.currentStatus = statuses.BUSY;

                me.initializeAcquisitionData();
                me.acquisitionData.token = uuidUtils.generateGuid();

                if (me.configuration.camera) {
                    me.appendImageAndRotate(me.acquisitionData.token).then(function (result) {
                        result.token = me.acquisitionData.token;
                        resolve(result);
                    }, function (error) {
                        reject(error);
                    });
                }
                else {
                    resolve(me.acquisitionData.token);
                }
            });
        };
    }
;

module.exports = Manager;