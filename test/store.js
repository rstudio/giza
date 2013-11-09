var Store = require('../lib/store/store');
var should = require('should');
var sinon = require('sinon');

var bub;
var bubblerSpy = sinon.spy();

describe('Store', function(){
  beforeEach(function(){
    bubblerSpy.reset();
    store = new Store({emit: bubblerSpy});
  }),
  describe('#save', function(){
    it('should trim trailing slash on save', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, 'username', 'jeff');
      should(store.get(path)).eql({username: 'jeff'});
    }),
    it('emits pre-create event', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, 'username', 'jeff');
      bubblerSpy.called.should.be.true;
      bubblerSpy.calledWith(path, 'pre-create').should.be.true;
      bubblerSpy.calledWith(path, 'pre-update').should.be.true;
    }),
    it('emits pre-update event', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, 'username', 'jeff');
      
      bubblerSpy.reset();

      store.save(path, 'username', 'someVal');
      bubblerSpy.called.should.be.true;
      bubblerSpy.calledWith(path, 'pre-create').should.be.false;
      bubblerSpy.calledWith(path, 'pre-update').should.be.true;
    }),
    it('emits post-create event', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, 'username', 'jeff');
      bubblerSpy.called.should.be.true;
      bubblerSpy.calledWith(path, 'post-create').should.be.true;
      bubblerSpy.calledWith(path, 'post-update').should.be.true;
    }),
    it('emits post-update event', function(){
      var path = '/app1/proc1/conn1'
      store.save(path, 'username', 'jeff');
      
      bubblerSpy.reset();

      store.save(path, 'username', 'someVal');
      bubblerSpy.called.should.be.true;
      bubblerSpy.calledWith(path, 'post-create').should.be.false;
      bubblerSpy.calledWith(path, 'post-update').should.be.true;
    })
  }),
  describe('#get', function(){
    it('properly stores and gets data.', function(){
      store.save('/app1/proc1/conn1', 'username', 'jeff');
      should(store.get('/app1/proc1/conn1')).eql({username: 'jeff'});
    }),    
    it('should trim trailing slash on get', function(){
      store.save('/app1/proc1/conn1', 'username', 'jeff');
      should(store.get('/app1/proc1/conn1/')).eql({username: 'jeff'});
    })
  }),
  describe('#exists', function(){
    it('should know real keys exist.', function(){
      store.save('/app1/proc1', 'username', 'jeff')
      store.exists('/app1/proc1', 'username').should.be.true;
    }),
    it('should know unreal keys don\'t exist.', function(){
      store.save('/app1/proc1', 'username', 'jeff')
      store.exists('/app1/proc1', 'flargdarg').should.be.false;
    }),
    it('should know real objects exist.', function(){
      store.save('/app1/proc1', 'username', 'jeff')
      store.exists('/app1/proc1').should.be.true;
    }),
    it('should know unreal objects don\'t exist', function(){
      store.exists('/app1/proc1').should.be.false;
    }),
    it('should trim any trailing slash', function(){
      store.save('/app1/proc1', 'username', 'jeff')
      store.exists('/app1/proc1/').should.be.true;
    })
  }),
  describe('#delete', function(){
    it('should delete the requested object', function(){
      var path = '/app1/proc1';
      store.save(path, 'username', 'jeff');
      var result = store.delete(path);
      store.exists(path).should.be.false;
      result.should.be.true;
    }),
    it('should delete the requested key', function(){
      var path = '/app1/proc1';
      store.save(path, 'username', 'jeff');
      var result = store.delete(path, 'username');
      store.exists(path).should.be.true;
      store.exists(path, 'username').should.be.false;
      result.should.be.true;
    }),
    it('should return false when deleting non-existant objects', function(){
      var path = '/app1/proc1';
      store.save(path, 'username', 'jeff');
      var result = store.delete(path, 'flargdarg');
      result.should.be.false;
    })
  })
});