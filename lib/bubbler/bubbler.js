var _ = require('underscore'),
  map = require('../core/map'),
  events = require('events'),
  PathUtil = require('../core/path-util');

module.exports = Bubbler;

function Bubbler(store){  
  this.$eventBus = new events.EventEmitter();
  this.$bubbleBus = new events.EventEmitter();
  this.$store = store;
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

  this.emit = function(path, event){
    path = PathUtil.cleanPath(path);
    
    var source = {
      path: path      
    };

    if (this.$store){
      source.obj = this.$store.get(path);
      source.type = this.$store.getType(path);
    }

    // About 3x faster than Array.prototype.splice + shifting
    var args = [path, event, source];
    for (var i = 2; i < arguments.length; i++){
      args.push(arguments[i]);
    }

    // emit locally
    var ebArgs = _.clone(args);
    this.$eventBus.emit.apply(this.$eventBus, args);

    // bubble event
    bubbleEvent(path, event, this.$bubbleBus, args); //120
  }

  this.clearSubscriptions = function(path){
    this.$eventBus.removeAllListeners(path);
  }

  this.setStore = function(store){
    this.$store = store;
  }

}).call(Bubbler.prototype);

/**
 *
 * 
 * Note that this function will NOT sanitize the path or source. Both are
 * expected to be pre-sanitized before entering this loop. (Shaves 50% off 
 * time spent bubbling).
 */
function bubbleEvent(path, event, bus, args, type, source){
  // No source given. Assume the current path is the root
  if (arguments.length < 6 || typeof source === 'undefined'){
    source = path;
  }

  var lastSlash = path.lastIndexOf('/');
  if (lastSlash !== -1){
    // Has a slash not at the end. Trim up to the last slash
    path = path.substring(0, lastSlash);

    if (path === ''){
      //Must have been the root URI. Don't recurse
      args[0] = '/';
      bus.emit.apply(bus, args); //50ms here
    } else{      
      // Fire event and recurse
      args[0] = path;
      bus.emit.apply(bus, args);
      bubbleEvent(path, event, bus, args, type, source);
    }
  }
}