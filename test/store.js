var Store = require('../lib/store/store');
var should = require('should');
var sinon = require('sinon');
var Passthrough = require('../lib/assemblers/passthrough');

var bub;
var bubblerSpy = sinon.spy();

describe('Store', function(){
  beforeEach(function(){
    bubblerSpy.reset();
    store = new Store({emit: bubblerSpy}, {'_': new Passthrough()});    
  }),
  describe('#save', function(){
    it('should trim trailing slash on save', function(){
      var path = '/app1/proc1/conn1'
      store.save(path + '/', {username: 'jeff'});
      should(store.get(path)).eql({username: 'jeff'});
    }),
    it('notifies but no update if no value given', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, {username: 'jeff'});

      bubblerSpy.reset();

      store.save(path);      
      bubblerSpy.calledWith(path, 'pre-update').should.be.true;
      should(store.get(path)).eql({username: 'jeff'});
    }),
    it('emits pre-create event', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, {username: 'jeff'});
      bubblerSpy.called.should.be.true;
      bubblerSpy.calledWith(path, 'pre-create').should.be.true;
      bubblerSpy.calledWith(path, 'pre-update').should.be.true;
    }),
    it('emits pre-update event', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, 'username', 'jeff');
      
      bubblerSpy.reset();

      store.save(path, {username: 'jeff'});
      bubblerSpy.called.should.be.true;
      bubblerSpy.calledWith(path, 'pre-create').should.be.false;
      bubblerSpy.calledWith(path, 'pre-update').should.be.true;
    }),
    it('emits post-create event', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, {username: 'jeff'});
      bubblerSpy.called.should.be.true;
      bubblerSpy.calledWith(path, 'post-create').should.be.true;
      bubblerSpy.calledWith(path, 'post-update').should.be.true;
    }),
    it('emits post-update event', function(){
      var path = '/app1/proc1/conn1';
      store.save(path, {username: 'jeff'});
      
      bubblerSpy.reset();

      store.save(path, {username: 'jeff'});
      bubblerSpy.called.should.be.true;
      bubblerSpy.calledWith(path, 'post-create').should.be.false;
      bubblerSpy.calledWith(path, 'post-update').should.be.true;
    }),
    it('properly stores type', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, {username: 'jeff'}, 'user');
      store.getType(path).should.equal('user');
    })
  }),
  describe('#get', function(){
    it('properly stores and gets data.', function(){
      var path = '/app1/proc1/conn1';
      store.save(path, {username: 'jeff'});
      should(store.get('/app1/proc1/conn1')).eql({username: 'jeff'});
    }),    
    it('should trim trailing slash on get', function(){
      var path = '/app1/proc1/conn1';
      store.save(path, {username: 'jeff'});
      should(store.get('/app1/proc1/conn1/')).eql({username: 'jeff'});
    }),
    it('should recursively get objects', function(){
      store.save('/abc', {a: 1});
      store.save('/abc/123', {b: 2});
      store.save('/abc/456', {c: 3});
      
      should(store.get('/abc', {recursive: true})).eql({a: 1, '/123': {b:2}, '/456': {c:3}});
    }),
    it('should get only this object\'s properties', function(){
      store.save('/abc', {a: 1});
      store.save('/abc/123', {b: 2});
      store.save('/abc/456', {c: 3});

      should(store.get('/abc', {recursive: false})).eql({a: 1});
    }),
    it('uses the default assembler for untyped paths', function(){
      var myStore = new Store({emit: bubblerSpy}, {
        '_': {
          name: 'default', 
          serialize: function(){return {val: 'serialize'}},
          deserialize: function(){return {val: 'deserialize'}}
        }
      });  
      myStore.save('/abc', {a: 1});
      should(myStore.$data['/abc']).eql({val: 'deserialize'});
      should(myStore.get('/abc')).eql({val: 'serialize'});
    }),
    it('uses the appropriately typed assembler for typed paths', function(){
      var myStore = new Store({emit: bubblerSpy}, {
        '_': new Passthrough(),
        'user': {
          name: 'default', 
          serialize: function(obj){return {val: 'user'}},
          deserialize: function(obj){return {val: 'user'}}
        }
      });  
      myStore.save('/abc', {a: 1}, 'user');
      should(myStore.$data['/abc']).eql({val: 'user'});
      should(myStore.get('/abc')).eql({val: 'user'});
    }),
    it('uses the default assembler for unrecognized types', function(){
      var myStore = new Store({emit: bubblerSpy}, {
        '_': new Passthrough(),
        'user': {
          name: 'default', 
          serialize: function(obj){return {val: 'user'}},
          deserialize: function(obj){return {val: 'user'}}
        }
      });
      myStore.save('/abc', {a: 1}, 'flargdarg');
      should(myStore.$data['/abc']).eql({a: 1});
      should(myStore.get('/abc')).eql({a: 1});
    }),
    it('respects assembler overrides', function(){
      var myStore = new Store({emit: bubblerSpy}, {
        '_': new Passthrough(),
        'user': {
          name: 'default', 
          serialize: function(obj){return {val: 'user'}},
          deserialize: function(obj){return obj}
        }
      });  
      myStore.save('/abc', {a: 1}, 'user');
      should(myStore.get('/abc', {
        assembler: new Passthrough()
      })).eql({a : 1});
    }),
    it('respects type overrides', function(){
      var myStore = new Store({emit: bubblerSpy}, {
        'group': new Passthrough(),
        'user': {
          name: 'default', 
          serialize: function(obj){return {val: 'user'}},
          deserialize: function(obj){return obj}
        }
      });  
      myStore.save('/abc', {a: 1}, 'user');
      should(myStore.get('/abc', {type: 'group'})).eql({a : 1});
    })
  }),
  describe('#exists', function(){
    it('should know real objects exist.', function(){
      var path = '/app1/proc1';
      store.save(path, {username: 'jeff'});
      store.exists(path).should.be.true;
    }),
    it('should know unreal objects don\'t exist', function(){
      store.exists('/app1/proc1').should.be.false;
    }),
    it('should trim any trailing slash', function(){
      var path = '/app1/proc1/conn1';
      store.save(path, {username: 'jeff'});
      store.exists(path + '/').should.be.true;
    })
  }),
  describe('#delete', function(){
    it('should delete the requested object', function(){
      var path = '/app1/proc1';
      store.save(path, {username: 'jeff'});
      var result = store.delete(path);
      store.exists(path).should.be.false;
      result.should.be.true;
    }),
    it('should return false when deleting non-existant objects', function(){
      var path = '/app1/proc1';
      store.save(path, {username: 'jeff'});
      var result = store.delete('/app1/flargdarg');
      result.should.be.false;
    }),
    it('should emit delete events', function(){
      var path = '/abc/def/ghi'
      store.save(path, {username: 'jeff'});
      
      bubblerSpy.reset();

      store.delete(path);
      bubblerSpy.calledWith(path, 'pre-delete').should.be.true;
      bubblerSpy.calledWith(path, 'post-delete').should.be.true;
    }),
    it('should emit delete events on deleted children', function(){
      var path = '/abc/def/ghi'
      store.save(path, {username: 'jeff'});
      
      bubblerSpy.reset();

      store.delete('/abc');
      bubblerSpy.calledWith(path, 'pre-delete').should.be.true;
      bubblerSpy.calledWith(path, 'post-delete').should.be.true;
    }),
    it('deletes type of associated objects', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, {username: 'jeff'}, 'user');
      store.delete(path);
      should(store.getType(path)).equal(undefined);
    }),
    it('deletes type of deleted children', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, {username: 'jeff'}, 'user');
      store.delete('/app1');
      should(store.getType(path)).equal(undefined);
    })
  })
});