var _ = require('underscore'),
  map = require('../core/map'),
  events = require('events'),
  PathUtil = require('../core/path-util');

module.exports = Bubbler;

function Bubbler(){  
  this.$eventBus = new events.EventEmitter();
  this.$bubbleBus = new events.EventEmitter();
}

(function(){
  this.subscribe = function(path, bubble, callback){
    path = PathUtil.cleanPath(path);

    // For events targetting this node
    this.$eventBus.on(path, callback);
    
    // For events bubbling to/through this node
    if (bubble){
      this.$bubbleBus.on(path, callback);
    }
  }

  this.emit = function(path, event){
    path = PathUtil.cleanPath(path);

    // emit locally
    this.$eventBus.emit(path, event);

    // bubble event
    bubbleEvent(path, event, this.$bubbleBus);

  }
}).call(Bubbler.prototype);

function bubbleEvent(path, event, bus){
  path = PathUtil.cleanPath(path);

  var lastSlash = path.lastIndexOf('/');
  if (lastSlash !== -1){
    // Has a slash not at the end. Trim up to the last slash
    path = path.substring(0, lastSlash);

    if (path === ''){
      //Must have been the root URI. Don't recurse
      bus.emit('/', event);
    } else{      
      // Fire event and recurse
      bus.emit(path, event);
      bubbleEvent(path, event, bus);
    }
  }
}