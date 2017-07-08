/**
 * Created by barte_000 on 2017-07-08.
 */
module.exports = {
    checkIfValueExists: function(collection, collectionProperty, value){
        var found = false;

        for(var i=0;i<collection.length;i++){
            if(collection[i][collectionProperty] === value){
                found = true;
                break;
            }
        }
        return found;
    },

    checkIfHasValue: function(collection, value){
        var found = false;

        for(var k in collection){
            if(collection.hasOwnProperty(k)){
                if(collection[k] === value){
                    found = true;
                    break;
                }
            }
        }

        return found;
    }
};