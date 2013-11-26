
var _ = require('underscore'),
  Map = require('../core/map'),
  PathUtil = require('../core/path-util');

module.exports = Store;

function Store(bubbler, assemblers){
  this.$data = new Map();  
  this.$bubbler = bubbler;
  this.$types = new Map();
  this.$assemblers = assemblers;
  this.$computed = new Map();
}

(function(){
  this.save = function(path, val, type){
    path = PathUtil.cleanPath(path);

    var nodes = parsePath(path, [this.$data, this.$computed], true);
    var createMode = nodes.created;

    var curVal = null;

    if (createMode){
      // Fire create only if it's new.
      this.$bubbler.emit(path, 'pre-create', type);  
    } else{
      curVal = nodes.current[0];
      this.$bubbler.emit(path, 'pre-update', type, curVal);
    }
    
    if (arguments.length >= 2 && typeof val !== 'undefined'){
      var assembler = this.$assemblers[type] || this.$assemblers['_'];
      if (!assembler){
        throw new Error("Can't save object as there is no assembler for type '"+
          type + "' and no default.");
      }
      nodes.parent[0][nodes.dirName] = assembler.deserialize(val);
      if (arguments.length >= 3 && typeof type !== 'undefined'){
        this.$types[path] = type;
      }
    } // else no value given. Just notifying of an update. No-op.

    if (createMode){
      // Fire create only if it's new.
      this.$bubbler.emit(path, 'create', type);
    } else{
      this.$bubbler.emit(path, 'update', type, curVal);
    }
  }

  /**
   * @returns false if the object doesn't exist or couldn't be deleted, true
   *   if the object was deleted.
   */
  this.delete = function(path){
    path = PathUtil.cleanPath(path);

    var nodes = parsePath(path, [this.$data, this.$computed]);

    // No such path
    if (!nodes){
      return false;
    }

    var toReturn = true;

    // Does this node have children? If so, recurse on them so they get 
    // proper delete notifications.
    childKeys = _.filter(_.keys(nodes.current[0]), function(key){
      return key.match(/^\//);
    });    
    var thisStore = this;
    _.each(childKeys, function(key){
      var result = thisStore.delete(path + key);
      if (!result){
        toReturn = false;
      }
    });

    curVal = nodes.current[0];
    
    this.$bubbler.emit(path, 'pre-delete', this.getType(path), curVal);
    this.$bubbler.clearSubscriptions(path);
    delete nodes.parent[0][nodes.dirName];
    delete nodes.parent[1][nodes.dirName];
   
    var type = this.getType(path);

    // delete any associated type information
    delete this.$types[path];

    this.$bubbler.emit(path, 'delete', type, curVal);
    return toReturn;
  }

  this.find = function(filter, options){
    var types = filter.types || null;

    if (!_.isArray(types)){
      types = [types];
    }

    var thisGiza = this;
    var toReturn = new Map();
    _.each(this.$types, function(val, key){
      if ((!types || _.contains(types, val))){
        toReturn[key] = thisGiza.get(key, options);
      }
    });
    return toReturn;
  }  
  
  this.get = function(path, options){
    path = PathUtil.cleanPath(path);

    if (!options){
      options = new Map();
    }

    var recursive = options.recursive || false;
    var includeComputed = _.has(options, 'computed') ? options.computed : true;

    var type = options.type || String(this.$types[path]);

    var assembler = options.assembler || this.$assemblers[type] ||
        this.$assemblers['_'];

    if (!assembler){
      // Check for a default assembler
      throw new Error("No assembler available to get the path '" + path + 
        "' with " + (type ? "type '" + type + "'" : 'no defined type') + 
        ', no specified assembler in get(), and no default assembler.');
    }

    var nodes = parsePath(path, [this.$data, this.$computed]);

    var toReturn = nodes.current[0];
    var keys = _.keys(toReturn);
    var childKeys = _.filter(keys, function(key){
      return key.match(/^\//);
    });
    var nonChildKeys = _.difference(keys, childKeys);

    if (recursive){        
      
      // Recursively get each child. Necessary to employ the proper assembler
      // and inclusion of computed properties.
      var thisStore = this;
      _.each(childKeys, function(childKey){
        toReturn[childKey] = thisStore.get(path + childKey, options);
      });

      // Don't want the empty children to override the real ones.
      if (includeComputed){
        var comp = trimSubdirs(nodes.current[1]);
        return _.extend(toReturn, comp);
      } else{
        return toReturn;
      }      
    } else{
      // trim out all keys starting with '/'
      var node = _.omit(nodes.current[0], childKeys);
      
      if (includeComputed){
        var comp = trimSubdirs(nodes.current[1]);
        _.extend(node, comp);
      }
      return assembler.serialize(node);
    }

    return toReturn;
  }

  this.exists = function(path){
    path = PathUtil.cleanPath(path);

    var nodes = parsePath(path, this.$data);

    return !!nodes;    
  }

  this.getType = function(path){
    return this.$types[path];
  }

  // TODO: support async callbacks.
  this.addTrigger = function(path, name, callback, thisArg){
    path = PathUtil.cleanPath(path);

    if (name.match(/^\//)){
      throw new Error("Trigger names can't begin with a '/'.");
    }

    if (!this.exists(path)){
      throw new Error("Cannot add a trigger on a path that doesn't exist.");
    }

    var thisStore = this;
    this.$bubbler.subscribe(path, function(){
      var result = callback.apply(thisArg || null, arguments);
      var nodes = parsePath(path, thisStore.$computed, true);
      nodes.current[name] = result;
      thisStore.$bubbler.emit(path, {name: name, triggered:true}, thisStore.getType(path));
    }, {recursive: true, triggered: false});
  }
}).call(Store.prototype);

/**
 * Parses the given path in the data provided and returns relevant info about
 * the requested node.
 * @param path The string path to parse
 * @param data The tree(s) to traverse. Accepts multiple trees in an array. If
 *   multiple trees, currrent and parent will also be matching arrays.
 * @param create Whether or not to create the path (and any necessary 
 *   ancestors). Default is false.
 * @return Will try to return an object with the parent node, the current node,
 *   and the last address. If it encounters a path that doesn't exist in non-
 *   create mode, it will return false; if in create mode, it will create the
 *   paths and then return the nodes with an additional value of 'created: true'
 */
function parsePath(path, data, create){
  var layers = path.split('/');
  // Get past the root level.
  layers.shift();

  var parentNode = null;
  var curNode = data;    
  var thisLayer;
  var created = false;
  
  // Captures whether or not multiple trees were provided.
  var multiTree = _.isArray(data);

  while (layers.length > 0){
    thisLayer = '/' + layers.shift();
    if (!_.has(multiTree ? curNode[0] : curNode, thisLayer)){
      if (create){        
        created = true;
        if (multiTree){
          // Create in every tree given.
          _.each(curNode, function(node){
            node[thisLayer] = new Map();  
          });
        } else{
          curNode[thisLayer] = new Map();
        }        
      } else{
        return false;  
      }      
    }
    parentNode = curNode;
    if (multiTree){
      // Manual map that preserves pass-by-ref
      curNode = _.map(curNode, function(node){
        return node[thisLayer];
      });
    } else{
      curNode = curNode[thisLayer];
    }
  }
  return {
    parent: parentNode, 
    current: curNode, 
    dirName: thisLayer, 
    created: created
  }
}

/**
 * Trim any objects starting with a '/' from this node.
 */
function trimSubdirs(node){
  var keys = _.keys(node);
  keys = _.filter(keys, function(key){
    return ! key.match(/^\//);
  });
  return _.pick(node, keys);
}
