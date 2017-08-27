let mongoose = require('mongoose');
let path = require('path');
let config = require(path.join(__dirname, '..', '..', 'config.json'));


let imageSchema = mongoose.Schema({
    thumbnail: {type: String, required: false},
    images: [{type: mongoose.Schema.Types.ObjectId, ref: 'Chunk', required: true}],
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

let Image = mongoose.model('Image', imageSchema);
module.exports = Image;