
var _ = require('underscore'),
  Map = require('../core/map');

module.exports = Store;

function Store(bubbler){
  this.$data = new Map();  
  this.$bubbler = bubbler;
}

(function(){
  this.save = function(path, key, val){
    // Replace trailing slash(es)
    path = path.replace(/\/+$/, '');

    var createMode = false;

    if (!_.has(this.$data, path)){
      this.$data[path] = new Map();
      createMode = true;
    }

    var pathNode = this.$data[path];

    if (!createMode && !_.has(pathNode, key)){
      // if already createMode, dont' even bother checking
      createMode = true;
    }

    if (createMode){
      // Fire create only if it's new.
      this.$bubbler.emit(path, 'pre-create');  
    }
    // Fire update regardless of whether or not it's new
    this.$bubbler.emit(path, 'pre-update');
    
    pathNode[key] = val;

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
  this.delete = function(path, key){
    // Replace trailing slash(es)
    path = path.replace(/\/+$/, '');

    if (!_.has(this.$data, path)){
      return false;
    }

    if (arguments.length < 2 || typeof key === 'undefined'){
      this.$bubbler.emit(path, 'pre-delete');
      delete this.$data[path];
    } else{
      if (!_.has(this.$data[path], key)){
        return false;
      }
      
      this.$bubbler.emit(path, 'pre-delete');
      delete this.$data[path][key];
    }

    this.$bubbler.emit(path, 'post-delete');
    return true;
  }

  this.get = function(path, key){
    // Replace trailing slash(es)
    path = path.replace(/\/+$/, '');

    if (arguments.length < 2 || typeof key === 'undefined'){
      // No key. Return whole object.
      return this.$data[path];
    }

    if (!_.has(this.$data, path)){
      return undefined;
    }
    return this.$data[path][key];
  }

  this.exists = function(path, key){
    // Replace trailing slash(es)
    path = path.replace(/\/+$/, '');

    if (arguments.length < 2 || typeof key === 'undefined'){
      // No key. Check whole path
      return _.has(this.$data, path);
    }
    return _.has(this.$data, path) && _.has(this.$data[path], key);
  }
}).call(Store.prototype);