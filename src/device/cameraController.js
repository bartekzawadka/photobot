let fs = require('fs');
let _ = require('lodash');
let path = require('path');
let gphoto2 = require('gphoto2');
let childProcess = require('child_process');

let Gphoto = new gphoto2.GPhoto2();

let CameraController = function () {

    CameraController.prototype.getCameras = function () {
        return new Promise(function (resolve) {
            Gphoto.list(function (list) {
                if (!list || list.length === 0) {
                    resolve([]);
                }

                let result = [];
                for (let k = 0; k < list.length; k++) {
                    result.push(list[k].model);
                }

                resolve(list);
            })
        });
    };

    CameraController.prototype.capture = function (deviceName) {
        return new Promise(function (resolve, reject) {
            if (!deviceName) {
                reject('Device was not specified');
                return;
            }

            try {
                childProcess.exec('gphoto2 --camera "'+deviceName+'" --capture-image-and-download', function(err, out){
                   if(err){
                       reject(err);
                       return;
                   }

                   let result = out.match(/\bSaving file as.*\b/g);
                   if(!result || result.leading !== 1){
                       reject('Could not extract stored camera file name');
                       return;
                   }

                   let fName = result[0].substr(15);

                   const filePath = path.join(__dirname, fName);

                   let data = fs.readFileSync(filePath);
                   if(!data){
                       reject('Error occurred while reading image file data. No data received');
                       return;
                   }

                   let dataString = "data:image/jpeg;base64," + data.toString('base64');

                   fs.unlinkSync(filePath);

                   resolve(dataString);
                });
            } catch (e) {
                reject('Error occurred while capturing image: ' + e);
            }
        });
    };
};

module.exports = CameraController;