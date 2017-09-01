let jimp = require('jimp');
let im = require('imagemagick');

module.exports = {
    get360ImageThumbnail: function (imageData, thumbnailWidth) {
        return new Promise(function (resolve, reject) {

            if (!imageData || !imageData.length || imageData.length < 1) {
                reject("Invalid image data. Not array or empty");
                return;
            }

            let imageIndex = Math.round(imageData.length / 2);
            if (imageIndex < 0)
                imageIndex = 0;
            else if (imageIndex >= imageData.length) {
                imageIndex = 0;
            }

            let imageToResize = imageData[imageIndex].replace("data:image/jpeg;base64,", "");

            if(!imageToResize || imageToResize.length === 0){
                reject("Image data empty");
                return;
            }

            try {

                let buffer = new Buffer(imageToResize, 'base64');

                im.resize({
                    srcData: buffer,
                    width: thumbnailWidth
                }, function(err, stdout, stderr){
                   if(err){
                       reject(err);
                       return;
                   }

                   let outBuff = new Buffer(stdout, 'ascii');
                   let base64 = "data:image/jpeg;base64,"+outBuff.toString('base64');
                    resolve(base64);
                });
            } catch (e) {
                reject(e);
            }
        });
    }
};