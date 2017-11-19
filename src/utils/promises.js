module.exports = {
  processPromisesArray: function(array, fn){
      let index = 0;

      return new Promise(function(resolve, reject){
        function next(){
            if(index < array.length){
                fn(array[index]).then(function(){
                    index++;
                    next();
                }).catch(reject);
            } else {
                resolve();
            }
        }
          next();
      });
  },
  processPromisesArrayAction: function(array, fn, callback){
      let index = 0;

      return new Promise(function(resolve, reject){
          function next(){
              if(index < array.length){
                  fn(array[index]).then(function(item){
                      index++;
                      if(callback){
                          callback(item);
                      }
                      next();
                  }).catch(reject);
              } else {
                  resolve();
              }
          }
          next();
      });
  }
};