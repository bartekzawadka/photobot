let fs = require('fs');
let path = require('path');

module.exports = {
  clearDirectory: function(dir){
      let files = fs.readdirSync(dir);
      for(let file of files){
          fs.unlinkSync(path.join(dir, file));
      }
  }
};