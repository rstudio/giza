
require('./core/log'),
  _ = require('underscore'),
  Q = require('q'),
  map = require('./core/map'),
  Bubbler = require('./bubbler/bubbler'),
  Store = require('./store/store');

module.exports = Giza;

function Giza(){
  this.$bubbler = new Bubbler();
  this.$store = new Store(this.$bubbler);  
}

(function(){
  this.save = function(path, key, val){
    return this.$store.save.apply(this.$store, arguments);
  }

  this.get = function(path, key){
   return this.$store.get.apply(this.$store, arguments); 
  }

  this.subscribe = function(path, callback, bubble){
    return this.$bubbler.subscribe.apply(this.$bubbler, arguments);
  }

  this.emit = function(path, event){
    return this.$bubbler.emit.apply(this.$bubbler, arguments);
  }
}).call(Giza.prototype);