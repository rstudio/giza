var Store = require('../lib/store/store');
var Bubbler = require('../lib/bubbler/bubbler');
var should = require('should');
var sinon = require('sinon');
var Passthrough = require('../lib/assemblers/passthrough');

var bub;
var bubblerSpy = sinon.spy();
var clearSpy = sinon.spy();

describe('Store', function(){
  beforeEach(function(){
    bubblerSpy.reset();
    store = new Store({emit: bubblerSpy, clearSubscriptions: clearSpy}, 
      {'_': new Passthrough()});    
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
      bubblerSpy.calledWith(path, 'pre-update').should.be.false;
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
    it('emits create event', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, {username: 'jeff'});
      bubblerSpy.called.should.be.true;
      bubblerSpy.calledWith(path, 'create').should.be.true;
      bubblerSpy.calledWith(path, 'update').should.be.false;
    }),
    it('emits update event', function(){
      var path = '/app1/proc1/conn1';
      store.save(path, {username: 'jeff'});
      
      bubblerSpy.reset();

      store.save(path, {username: 'jeff'});
      bubblerSpy.called.should.be.true;
      bubblerSpy.calledWith(path, 'create').should.be.false;
      bubblerSpy.calledWith(path, 'update').should.be.true;
    }),
    it('properly stores type', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, {username: 'jeff'}, 'user');
      store.getType(path).should.equal('user');
    }),
    it('emits current value with update, if any', function(){
      var path = '/app1/proc1/conn1';
      var obj = {username: 'jeff'};
      store.save(path, obj);
      
      bubblerSpy.reset();

      var obj2 = {user2: 'test'};
      store.save(path, obj2);
      bubblerSpy.called.should.be.true;
      bubblerSpy.calledWith(path, 'pre-update', undefined, obj).should.be.true;
      bubblerSpy.calledWith(path, 'update', undefined, obj).should.be.true;
    })
  }),
  describe('#find', function(){
    it('properly filters by type array', function(){
      store.save('/abc/a', {a: 1}, 'type1');
      store.save('/abc/b', {b: 2}, 'type2');
      store.save('/abc/c', {c: 3}, 'type3');
      should(store.find({types: ['type2', 'type3']})).eql({
        '/abc/b' : {b:2},
        '/abc/c' : {c:3}
      });
    }),
    it('properly filters by single type', function(){
      store.save('/abc/a', {a: 1}, 'type1');
      store.save('/abc/b', {b: 2}, 'type2');
      store.save('/abc/c', {c: 3}, 'type3');
      should(store.find({types: 'type2'})).eql({
        '/abc/b' : {b:2}        
      });
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
    }),
    it('ignores computed data if instructed', function(){
      var myStore = new Store(new Bubbler(), {'_': new Passthrough()});
      var path = '/app1/proc1';
      myStore.save(path, {username: 'jeff'});
      myStore.addTrigger(path, 'logins', function(event, source){
        return 16;
      });
      myStore.save(path);
      should.not.exist(myStore.get(path, {computed: false}).logins);
    }),
    it('supplements local object with computed data', function(){
      var myStore = new Store(new Bubbler(), {'_': new Passthrough()});
      var path = '/app1/proc1';
      myStore.save(path, {username: 'jeff'});
      myStore.addTrigger(path, 'logins', function(event, source){
        return 16;
      });
      myStore.save(path);
      myStore.get(path).logins.should.equal(16);
    }),
    it('supplements recursive objects with computed data', function(){
      var myStore = new Store(new Bubbler(), {'_': new Passthrough()});
      var path = '/app1/proc1';
      myStore.save(path, {username: 'jeff'});
      myStore.addTrigger(path, 'logins', function(event, source){
        return 16;
      });
      myStore.save(path);
      myStore.get('/app1', {recursive: true})['/proc1'].logins.should.equal(16);
    }),
    it('doesn\'t remove prototyped properties', function(){
      var path = '/app1/proc1/conn1';
      var Something = function(){};
      Something.prototype.variable = "hello";
      store.save(path, new Something());
      should(store.get('/app1/proc1/conn1')).eql({variable: 'hello'});
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
      bubblerSpy.calledWith(path, 'delete').should.be.true;
    }),
    it('should emit delete events on deleted children', function(){
      var path = '/abc/def/ghi'
      store.save(path, {username: 'jeff'});
      
      bubblerSpy.reset();

      store.delete('/abc');
      bubblerSpy.calledWith(path, 'pre-delete').should.be.true;
      bubblerSpy.calledWith(path, 'delete').should.be.true;
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
    }),
    it('deregisters subscriptions/triggers when deleting a node', function(){
      var path = '/app1/proc1';
      store.save(path, {username: 'jeff'});
      store.delete(path);
      clearSpy.calledWith(path).should.be.true;
    })
  }),
  describe('#addTrigger', function(){
    it('throws on non-existent paths', function(){
      var myStore = new Store(new Bubbler(), {'_': new Passthrough()});

      var path = '/app1/proc1';
      (function(){
        myStore.addTrigger(path, 'logins', function(event, source){
          clearTimeout(timeout);
          done();
        });
      }).should.throw();      
    }),
    it('calls back on local events', function(done){
      var timeout = setTimeout(done, 100, new Error("Timeout"));
      
      var myStore = new Store(new Bubbler(), {'_': new Passthrough()});      
      var path = '/app1/proc1';
      var firstCall = true;
      myStore.save(path, {username: 'jeff'});
      myStore.addTrigger(path, 'logins', function(event, source){
        clearTimeout(timeout);
        if (firstCall){
          firstCall = false;
          done(); // done doesn't like to be called multiple times.
        }
      });
      myStore.save(path);
    }),
    it('calls back on bubbled events', function(done){
      var timeout = setTimeout(done, 100, new Error("Timeout"));
      
      var myStore = new Store(new Bubbler(), {'_': new Passthrough()});
      var path = '/app1/proc1';
      var firstCall = true;
      myStore.save(path + '/conn1', {username: 'jeff'});
      myStore.save(path, {pid: 123});
      myStore.addTrigger(path, 'logins', function(event, source){
        clearTimeout(timeout);
        if (firstCall){
          firstCall = false;
          done(); // done doesn't like to be called multiple times.
        }
      });
      myStore.save(path+'/conn1');
    }),
    it('properly uses "thisArg"', function(done){
      var timeout = setTimeout(done, 100, new Error("Timeout"));
      
      var myStore = new Store(new Bubbler(), {'_': new Passthrough()});
      var path = '/app1/proc1';
      var firstCall = true;
      var obj = {a : 15};
      myStore.save(path, {username: 'jeff'});
      myStore.addTrigger(path, 'logins', function(event, source){
        clearTimeout(timeout);
        if (firstCall){
          this.a.should.equal(15);
          firstCall = false;
          done(); // done doesn't like to be called multiple times.
        }
      }, obj);
      myStore.save(path);
    }),
    it('throws on slash-prefixed names', function(){
      var myStore = new Store(new Bubbler(), {'_': new Passthrough()});
      var path = '/app1/proc1';      
      (function(){
        myStore.addTrigger(path, '/logins', function(event, source){});
      }).should.throw();
    })
  })
});