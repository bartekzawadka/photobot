var mongoose = require('mongoose');
var path = require('path');
var config = require(path.join(__dirname, '..', '..', 'config.json'));


var imageSchema = mongoose.Schema({
    thumbnail: {type: String, required: false},
    images: {type: [String], required: true},
    createdAt: {type: Date, required: true}
}, {
    collection: config.db.collection
});

imageSchema.pre('validate', function(next){
   if(this.isNew){
       this.createdAt = new Date();
   }

   next();
});

var Image = mongoose.model('Image', imageSchema);
module.exports = Image;