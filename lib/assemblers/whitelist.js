var _ = require('underscore');

module.exports = Whitelist;

function Whitelist(filter){
  this.name = "Whitelist";
  if (filter instanceof RegExp){
    this.$filter = function(key){
      return (key.match(filter));
    }
  } else if (filter instanceof Array){
    this.$filter = function(key){
      return _.contains(filter, key);
    }
  } else{
    throw new Error("Filter must be a regex or an array of keys to whitelist.");
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
}).call(Whitelist.prototype);
