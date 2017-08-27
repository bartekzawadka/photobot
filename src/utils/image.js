let jimp = require('jimp');

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

                new jimp(buffer, (err, image)=>{

                    if(err){
                        reject(err);
                        return;
                    }

                    if(!image){
                        reject("Invalid image data or unsupported format");
                        return;
                    }

                   image.resize(thumbnailWidth, jimp.AUTO).getBase64(image.getMIME(), (e, bu)=>{
                       if(e){
                           reject(e);
                           return;
                       }

                       resolve(bu);
                   })
                });
            } catch (e) {
                reject(e);
            }
        });
    }
};