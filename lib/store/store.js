
var _ = require('underscore'),
  Map = require('../core/map'),
  PathUtil = require('../core/path-util');

module.exports = Store;

function Store(bubbler, assemblers){
  this.$data = new Map();  
  this.$bubbler = bubbler;
  this.$types = new Map();
  this.$assemblers = assemblers;
}

(function(){
  this.save = function(path, val, type){
    path = PathUtil.cleanPath(path);

    var nodes = parsePath(path, this.$data, true);
    var createMode = nodes.created;

    if (createMode){
      // Fire create only if it's new.
      this.$bubbler.emit(path, 'pre-create');  
    }
    // Fire update regardless of whether or not it's new
    this.$bubbler.emit(path, 'pre-update');
    
    if (arguments.length >= 2 && typeof val !== 'undefined'){
      var assembler = this.$assemblers[type] || this.$assemblers['_'];
      if (!assembler){
        throw new Error("Can't save object as there is no assembler for type '"+
          type + "' and no default.");
      }
      nodes.parent[nodes.dirName] = assembler.deserialize(val);
      if (arguments.length >= 3 && typeof type !== 'undefined'){
        this.$types[path] = type;
      }
    } // else no value given. Just notifying of an update. No-op.

    if (createMode){
      // Fire create only if it's new.
      this.$bubbler.emit(path, 'post-create');  
    }
    // Fire update regardless of whether or not it's new
    this.$bubbler.emit(path, 'post-update');
  }

  /**
   * @returns false if the object doesn't exist or couldn't be deleted, true
   *   if the object was deleted.
   */
  this.delete = function(path){
    path = PathUtil.cleanPath(path);

    var nodes = parsePath(path, this.$data);

    // No such path
    if (!nodes){
      return false;
    }

    var toReturn = true;

    // Does this node have children? If so, recurse on them so they get 
    // proper delete notifications.
    childKeys = _.filter(_.keys(nodes.current), function(key){
      return key.match(/^\//);
    });    
    var thisStore = this;
    _.each(childKeys, function(key){
      var result = thisStore.delete(path + key);
      if (!result){
        toReturn = false;
      }
    });

    this.$bubbler.emit(path, 'pre-delete');
    delete nodes.parent[nodes.dirName];
   
    // delete any associated type information
    delete this.$types[path];

    this.$bubbler.emit(path, 'post-delete');
    return toReturn;
  }

  this.get = function(path, options){
    if (!options){
      options = new Map();
    }

    var recursive = options.recursive || false;
    var type = options.type || String(this.$types[path]);

    var assembler = options.assembler || this.$assemblers[type] ||
        this.$assemblers['_'];

    if (!assembler){
      // Check for a default assembler
      throw new Error("No assembler available to get the path '" + path + 
        "' with " + (type ? "type '" + type + "'" : 'no defined type') + 
        ', no specified assembler in get(), and no default assembler.');
    }

    path = PathUtil.cleanPath(path);

    var nodes = parsePath(path, this.$data);

    if (recursive){
      return nodes.current;
    } else{
      // trim out all keys starting with '/'
      var keys = _.keys(nodes.current);
      keys = _.filter(keys, function(key){
        return ! key.match(/^\//);
      });
      return assembler.serialize(_.pick(nodes.current, keys));
    }
  }

  this.exists = function(path){
    path = PathUtil.cleanPath(path);

    var nodes = parsePath(path, this.$data);

    return !!nodes;    
  }

  this.getType = function(path){
    return this.$types[path];
  }
}).call(Store.prototype);

/**
 * Parses the given path in the data provided and returns relevant info about
 * the requested node.
 * @param path The string path to parse
 * @param data The tree to traverse
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
  while (layers.length > 0){
    thisLayer = '/' + layers.shift();
    if (!_.has(curNode, thisLayer)){
      if (create){
        if (!_.has(curNode, thisLayer)){
          created = true;
          curNode[thisLayer] = new Map();
        }
      } else{
        return false;  
      }      
    }
    parentNode = curNode;
    curNode = curNode[thisLayer];
  }
  return {
    parent: parentNode, 
    current: curNode, 
    dirName: thisLayer, 
    created: created
  }
}
