let fs = require('fs');
let _ = require('lodash');
let path = require('path');
let config = require(path.join(__dirname, '..', '..', 'config.json'));
let childProcess = require('child_process');

let CameraController = function () {

    CameraController.prototype.getCameras = function () {
        return new Promise(function (resolve, reject) {
            childProcess.exec('gphoto2 --auto-detect', function (err, out) {
                if (err) {
                    reject(err);
                    console.log(err);
                    return;
                }

                let partials = out.split(/\r?\n/);

                if (!partials || partials.length <= 2) {
                    resolve([]);
                    return;
                }

                const portIndex = partials[0].indexOf('Port');

                let devices = [];

                for (let k = 2; k < partials.length - 1; k++) {
                    devices.push(partials[k].substr(0, portIndex).trim());
                }

                resolve(devices);
            });
        });
    };

    CameraController.prototype.capture = function (deviceName, index) {
        return new Promise(function (resolve, reject) {
            if (!deviceName) {
                reject('Device was not specified');
                return;
            }

            try {

                let filePath = path.join(config.imageStorageDirectory, 'image_' + index + '.jpg');

                childProcess.exec('sudo gphoto2 --camera="' + deviceName +
                    '" --capture-image-and-download  --stdout > ' + filePath,
                    {
                        maxBuffer: 1024 * 100000000
                    }, function (err) {

                        if (err) {
                            reject(err);
                            return;
                        }

                        resolve();
                    });
            } catch (e) {
                reject('Error occurred while capturing image: ' + e);
            }
        });
    };
};

module.exports = CameraController;