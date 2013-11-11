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
  this.subscribe = function(path, callback, bubble){
    path = PathUtil.cleanPath(path);

    // For events targetting this node
    this.$eventBus.on(path, callback);
    
    // For events bubbling to/through this node
    if (arguments.length < 3 || typeof bubble === 'undefined' || bubble){
      this.$bubbleBus.on(path, callback);
    }
  }

  this.emit = function(path, event, type){
    path = PathUtil.cleanPath(path);

    // emit locally
    this.$eventBus.emit(path, event, path, type);

    // bubble event
    bubbleEvent(path, event, this.$bubbleBus, type);
  }

  this.clearSubscriptions = function(path){
    this.$eventBus.removeAllListeners(path);
  }

}).call(Bubbler.prototype);

/**
 *
 * 
 * Note that this function will NOT sanitize the path or source. Both are
 * expected to be pre-sanitized before entering this loop. (Shaves 50% off 
 * time spent bubbling).
 */
function bubbleEvent(path, event, bus, type, source){
  // No source given. Assume the current path is the root
  if (arguments.length < 5 || typeof source === 'undefined'){
    source = path;
  }

  var lastSlash = path.lastIndexOf('/');
  if (lastSlash !== -1){
    // Has a slash not at the end. Trim up to the last slash
    path = path.substring(0, lastSlash);

    if (path === ''){
      //Must have been the root URI. Don't recurse
      bus.emit('/', event, source, type);
    } else{      
      // Fire event and recurse
      bus.emit(path, event, source, type);
      bubbleEvent(path, event, bus, type, source);
    }
  }
}