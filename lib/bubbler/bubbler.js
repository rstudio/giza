var _ = require('underscore'),
  map = require('../core/map'),
  events = require('events');

module.exports = Bubbler;

function Bubbler(){  
  this.$eventBus = new events.EventEmitter();
  this.$bubbleBus = new events.EventEmitter();
}

(function(){
  this.subscribe = function(path, bubble, callback){
    // Replace trailing slash(es)
    path = path.replace(/\/+$/, '');

    // For events targetting this node
    this.$eventBus.on(path, callback);
    
    // For events bubbling to/through this node
    if (bubble){
      this.$bubbleBus.on(path, callback);
    }
  }

  this.emit = function(path, event){
    // Replace trailing slash(es)
    path = path.replace(/\/+$/, '');

    // emit locally
    this.$eventBus.emit(path, event);

    // bubble event
    bubbleEvent(path, event, this.$bubbleBus);

  }
}).call(Bubbler.prototype);

function bubbleEvent(path, event, bus){
  // Replace trailing slash(es)
  path = path.replace(/\/+$/, '');

  var lastSlash = path.lastIndexOf('/');
  if (lastSlash != -1){
    // Has a slash not at the end. Trim up to the last slash
    path = path.substring(0, lastSlash);

    // Fire event and recurse
    bus.emit(path, event);
    bubbleEvent(path, event, bus);
  }
}