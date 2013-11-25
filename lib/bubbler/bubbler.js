var _ = require('underscore'),
  map = require('../core/map'),
  events = require('events'),
  PathUtil = require('../core/path-util');

module.exports = Bubbler;

function Bubbler(store){  
  this.$eventBus = new events.EventEmitter();
  this.$bubbleBus = new events.EventEmitter();
  // We aren't actually registering the given callback on the eventBus, but some
  // wrapper for it. Need to track these wrappers so we can unsubscribe them.
  this.$callbacks = new Map();   
  this.$store = store;
}

(function(){
  // @param options
  //   - bubble - If true, will also fire on bubbled events
  //   - filters - An array of objects with the following values
  //       - types - If specified, will only fire on events contained in this 
  //             list.
  //       - events - If specified, will only fire on these events with these 
  //             names.
  this.subscribe = function(path, callback, options){
    if (!options){
      options = {};
    }
    var bubble = _.has(options, 'bubble') ? options.bubble : true;
    var filters = options.filters || false;
    var triggered = _.has(options, 'triggered') ? options.triggered : true;

    if (!_.isArray(filters)){
      filters = [filters];
    }
    
    path = PathUtil.cleanPath(path);

    var filteredCallback = function(event, source){
      var type = source ? source.type : undefined;
      if (!filters || matchFilter(event, type, filters) && (triggered || event !== 'giza-trigger')){
        callback.apply(null, arguments);
      }
    };
    this.$callbacks[callback] = filteredCallback;

    // For events targetting this node
    this.$eventBus.on(path, filteredCallback);
    
    // For events bubbling to/through this node
    if (arguments.length < 3 || typeof bubble === 'undefined' || bubble){
      this.$bubbleBus.on(path, filteredCallback);
    }
  }

  this.unsubscribe = function(path, callback){
    path = PathUtil.cleanPath(path);

    var filteredCallback = this.$callbacks[callback];

    if (filteredCallback){
      this.$eventBus.removeListener(path, filteredCallback);
      this.$bubbleBus.removeListener(path, filteredCallback);
    }

    delete this.$callbacks[callback];
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
    this.$eventBus.emit.apply(this.$eventBus, args);

    // bubble event
    bubbleEvent(path, event, this.$bubbleBus, args); //120
  }

  this.clearSubscriptions = function(path){
    //TODO optimize or delete will be expensive; at least batch these asynch.
    var ebListeners = this.$eventBus.listeners(path);
    var bubListeners = this.$bubbleBus.listeners(path);
    var listeners = _.union(ebListeners, bubListeners);

    var keys = _.keys(this.$callbacks);
    for (var i = 0; i < keys.length; i++){
      if (_.contains(listeners, this.$callbacks[keys[i]])){
        delete this.$callbacks[keys[i]];
        // could splice listeners to speed up.
      }
    }

    this.$eventBus.removeAllListeners(path);
    this.$bubbleBus.removeAllListeners(path);
  }

  this.setStore = function(store){
    this.$store = store;
  }

}).call(Bubbler.prototype);

/**
 * Determines whether or not the given event information matches the provided 
 * filters
 * @param eventName the
 *
 *
 */
function matchFilter(eventName, type, filters){
  // Don't want to use something like _.each b/c we may want to exit prematurely
  var keys = _.keys(filters);
  for (var i = 0; i < keys.length; i++){
    var thisFilter = filters[keys[i]];
    
    if (typeof thisFilter.types === 'undefined' ){
      // we'll pass through for now.
    } else if (_.isArray(thisFilter.types)){
      if (thisFilter.types.length > 0 && !_.contains(thisFilter.types, type)){
        // There is a filter of length > 0 and it doesn't contain this type
        return false;
      }
    } else if (_.isString(thisFilter.types)){
      if (thisFilter.types != type){
        return false;
      }
    } else{
      throw new Error ("Invalid types provided, must either be a string or an " + 
        "array of strings: " + thisFilter.types);
    }

    if (typeof thisFilter.names === 'undefined' || thisFilter.names === ''){
      // Pass through for now
    } else if (_.isArray(thisFilter.names)){
      if (thisFilter.names.length > 0 && !_.contains(thisFilter.names, eventName)){
        // There is a filter of length > 0 and it doesn't contain this name
        return false;
      }
    } else if (_.isString(thisFilter.names)){
      if (thisFilter.names != eventName){
        return false;
      }
    } else{
      throw new Error ("Invalid name provided, must either be a string or an " + 
        "array of strings: " + thisFilter.names);
    }
  }
  // Made it through without returning false.
  return true;
}

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