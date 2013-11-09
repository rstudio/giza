
var _ = require('underscore'),
  Map = require('../core/map'),
  PathUtil = require('../core/path-util');

module.exports = Store;

function Store(bubbler){
  this.$data = new Map();  
  this.$bubbler = bubbler;
}

(function(){
  this.save = function(path, key, val){
    path = PathUtil.cleanPath(path);

    var nodes = parsePath(path, this.$data, true);
    var createMode = nodes.created;

    if (createMode && !_.has(nodes.current, key)){
      // if already createMode, dont' even bother checking
      createMode = true;
    }

    if (createMode){
      // Fire create only if it's new.
      this.$bubbler.emit(path, 'pre-create');  
    }
    // Fire update regardless of whether or not it's new
    this.$bubbler.emit(path, 'pre-update');
    
    nodes.current[key] = val;

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
  this.delete = function(path, key){ //TODO: should it accept a key?

    path = PathUtil.cleanPath(path);

    var nodes = parsePath(path, this.$data);

    if (arguments.length < 2 || typeof key === 'undefined'){
      // Delete entire node recursively

      // Does this node have children? If so, recurse on them so they get 
      // proper delete notifications.
      childKeys = _.filter(_.keys(nodes.current), function(key){
        return key.match(/^\//);
      });
      var thisStore = this;
      _.each(childKeys, function(key){
        thisStore.delete(path + key)
      });

      this.$bubbler.emit(path, 'pre-delete');
      delete nodes.parent[nodes.dirName];
    } else{
      if (!_.has(nodes.current, key)){
        return false;
      }
      
      this.$bubbler.emit(path, 'pre-delete');
      delete nodes.current[key];
    }

    this.$bubbler.emit(path, 'post-delete');
    return true;
  }

  /**
   * @param callback If provided, will register the associated callback with 
   *   this path in the tree. If 'recursive' is true, the callback will also
   *   listen for bubbled events to this object. If not, it will only subscribe
   *   to events targeting this path.
   */
  this.get = function(path, key, recursive, callback){
    path = PathUtil.cleanPath(path);

    var nodes = parsePath(path, this.$data);

    if (arguments.length < 2 || typeof key === 'undefined' || 
        typeof key === 'boolean'){

      // No key, or it looks like the 2nd arg was actualy the 'recursive' arg.
      if (arguments.length < 3 || typeof recursive === 'undefined'){
        if (arguments.length >= 2 && typeof key === 'boolean'){
          // Must have provided 'recursive' as the second arg.
          recursive = key;
        } else{
          recursive = false;
        }
      }

      if (arguments.length >= 4 && typeof callback !== 'undefined'){
        this.$bubbler.subscribe(path, callback, recursive);
      }

      if (recursive){
        return nodes.current;
      } else{
        // trim out all keys starting with '/'
        var keys = _.keys(nodes.current);
        keys = _.filter(keys, function(key){
          return ! key.match(/^\//);
        });
        return _.pick(nodes.current, keys);
      }
    }

    if (!_.has(nodes.current, key)){
      return undefined;
    }
    return nodes.current[key];
  }

  this.exists = function(path, key){
    path = PathUtil.cleanPath(path);

    var nodes = parsePath(path, this.$data);

    if (!nodes){
      return false;
    }

    if (arguments.length < 2 || typeof key === 'undefined'){
      // No key. 
      return true;
    }
    return _.has(nodes.current, key);
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
