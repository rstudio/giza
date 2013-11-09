
module.exports = Passthrough;

function Passthrough(){
  this.name = "Passthrough";
}

(function(){
  this.serialize = function(obj){
    return obj;
  }

  this.deserialize = function(obj, source){
    return obj;
  }
}).call(Passthrough.prototype);
