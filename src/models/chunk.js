let mongoose = require('mongoose');

let chunkSchema = mongoose.Schema({
    index: {type: Number, required: true},
    image: {type: String, required: true}
}, {
    collection: "Chunks"
});

let Chunk = mongoose.model("Chunk", chunkSchema);
module.exports = Chunk;