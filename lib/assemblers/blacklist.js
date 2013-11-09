var _ = require('underscore');

module.exports = Blacklist;

function Blacklist(filter){
  this.name = "Blacklist";
  if (filter instanceof RegExp){
    this.$filter = function(key){
      return ( ! key.match(filter));
    }
  } else if (filter instanceof Array){
    this.$filter = function(key){
      return ! _.contains(filter, key);
    }
  } else{
    throw new Error("Filter must be a regex or an array of keys to Blacklist.");
  }

}

(function(){
  this.serialize = function(obj){
    var keys = _.filter(_.keys(obj), this.$filter);
    return _.pick(obj, keys);
  }

  this.deserialize = function(obj, source){
    var keys = _.filter(_.keys(obj), this.$filter);
    return _.extend(source, _.pick(obj, keys));
  }
}).call(Blacklist.prototype);
