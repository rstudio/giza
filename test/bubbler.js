var Bubbler = require('../lib/bubbler/bubbler');
var should = require('should');
var bub;

var TYPE = 'TYPE';
var OBJ = {obj: 'myObj'};
var MOCK_STORE = {getType: function(){return TYPE;}, get: function(){return OBJ;}};

describe('Bubbler', function(){
  beforeEach(function(){
    bub = new Bubbler(MOCK_STORE);
  }),
  describe("General Pub/Sub", function(){
    it('replaces trailing slash on subscribe', function(done){
      var obj = {a:1};
      bub.subscribe('/abc/def/', function(event, source, data){
        event.should.equal('event1');
        should(data).equal(obj);
        done();
      }, {bubble: false});
      bub.emit('/abc/def', 'event1', obj);
    }),
    it('replaces trailing slash on emit', function(done){
      var obj = {a:1};
      bub.subscribe('/abc/def', function(){
        done();
      }, {bubble: false});
      bub.emit('/abc/def/', obj);
    }),
    it('clears subscriptions', function(){
      bub.subscribe('/abc', function(){ return 2; });
      _.size(bub.$callbacks).should.equal(1);
      bub.$eventBus.listeners('/abc').length.should.equal(1);
      bub.$bubbleBus.listeners('/abc').length.should.equal(1);
      
      bub.clearSubscriptions('/abc');
      _.size(bub.$callbacks).should.equal(0);
      bub.$eventBus.listeners('/abc').length.should.equal(0);
      bub.$bubbleBus.listeners('/abc').length.should.equal(0);
    }),
    it('Passed emitted arguments through', function(done){
      var obj = {a:1};
      bub.subscribe('/abc', function(){
        arguments[0].should.equal('event');
        arguments[1].should.eql({path: '/abc/def', triggered: false, obj: OBJ, type: TYPE});
        arguments[2].should.equal(obj);
        arguments[3].should.equal(15);
        done();
      });
      bub.emit('/abc/def', 'event', obj, 15);    
    })
  }),
  describe("Targeted Pub/Sub", function(){
    it('properly subscribes and emits on a particular node', function(done){
      var obj = {a:1};
      bub.subscribe('/abc/def', function(event, source, data){
        event.should.equal('event1');
        source.should.eql({path: '/abc/def', triggered: false, obj: OBJ, type: TYPE});
        should(data).equal(obj);
        done();
      }, {bubble: false});
      bub.emit('/abc/def', 'event1', obj);
    }),
    it('doesn\'t fire on an excluded type, targeted event', function(done){
      var timeout = setTimeout(done, 100);

      bub.subscribe('/abc', function(){
        clearTimeout(timeout);
        done(new Error("Didn't properly exclude targeted event."));  
      }, {filters: [{types: ['type1', 'type2']}]});
      bub.emit('/abc');   
    }),
    it('does fire on an included type, targeted event', function(done){
      bub.subscribe('/abc', function(){
        done();
      }, {filters: [{types: ['type1', TYPE]}]});
      bub.emit('/abc');
    }),
    it('doesn\'t fire on an excluded event name, targeted event', function(done){
      var timeout = setTimeout(done, 100);

      bub.subscribe('/abc', function(){
        clearTimeout(timeout);
        done(new Error("Didn't properly exclude targeted event"));  
      }, {filters: [{names: ['event1', 'event2']}]});
      bub.emit('/abc', 'eventExcluded');
    }),
    it('does fire on an included event name, targeted event', function(done){
      bub.subscribe('/abc', function(){
        done();
      }, {filters: [{names: ['event1', 'event2']}]});
      bub.emit('/abc', 'event2');
    }),
    it('pub/subs 100k targeted events in less than 200ms', function(done){
      // this.timeout doesn't seem to be working. Implement our own.
      var timeout = setTimeout(done, 200, new Error("Took too long."));

      var counter = 0;
      var obj = {a:1};
      bub.subscribe('/abc', function(){
        counter++;
      }, {bubble: false});

      var iterations = 100000;

      for (var i = 0; i < iterations; i++){
        bub.emit('/abc', obj);
      }

      // We made it in time. Clear the timeout
      setTimeout(function(){
        clearTimeout(timeout);
      }, 5);

      // Keep v8 from ever outsmarting this test and skipping over the loop.
      counter.should.equal(iterations);
      done();
    })
  }),
  describe("Bubbled Pub/Sub", function(){
    it('bubbles events upwards.', function(done){
      var obj = {a:1};
      bub.subscribe('/abc', function(){
        done();
      });
      bub.emit('/abc/def/', obj);
    }),
    it('doesn\'t fire on an excluded type, bubbled event.', function(done){
      var timeout = setTimeout(done, 100);

      bub.subscribe('/abc', function(){
        clearTimeout(timeout);
        done(new Error("Didn't properly exclude bubbled event."));  
      }, {filters: [{types: ['type1', 'type2']}]});
      bub.emit('/abc/def');
    }),
    it('does fire on an included type, bubbled event.', function(done){
      bub.subscribe('/abc', function(){
        done();
      }, {filters: [{types: ['type1', TYPE]}]});
      bub.emit('/abc/def');
    }),
    it('doesn\'t fire on an excluded event name, bubbled event.', function(done){
      var timeout = setTimeout(done, 100);

      bub.subscribe('/abc', function(){
        clearTimeout(timeout);
        done(new Error("Didn't properly exclude bubbled event."));  
      }, {filters: [{names: ['event1', 'event2']}]});
      bub.emit('/abc/def', 'eventExcluded');
    }),
    it('does fire on an included event name, bubbled event.', function(done){
      bub.subscribe('/abc', function(){
        done();
      }, {filters: [{names: ['event1', 'event2']}]});
      bub.emit('/abc/def', 'event2');
    }),
    it('skips bubbled events if not subscribed', function(done){
      var timeout = setTimeout(done, 100);

      var obj = {a:1};
      bub.subscribe('/abc', function(data){
        clearTimeout(timeout);
        done(new Error("Bubbled event when it shouldn't have."));
      }, {bubble: false});
      bub.emit('/abc/def/', obj);
    }),
    it('bubbles events to root.', function(done){
      var obj = {a:1};
      bub.subscribe('/', function(event, source, data){
        source.should.eql({path: '/abc/def', triggered: false, obj: OBJ, type: TYPE});
        should(data).equal(obj);
        done();
      }, {bubble: true});
      bub.emit('/abc/def', 'event1', obj);
    }),
    it('pub/subs 100k (5-lvl) bubbled events in less than 500ms', function(done){
      // this.timeout doesn't seem to be working. Implement our own.
      var timeout = setTimeout(done, 500, new Error("Took too long."));

      var counter = 0;
      var obj = {a:1};
      bub.subscribe('/', function(){
        counter++;
      }, {bubble: true});

      var iterations = 100000;

      for (var i = 0; i < iterations; i++){
        bub.emit('/abc/def/ghi/jkl', obj);
      }

      // We made it in time. Clear the timeout
      setTimeout(function(){
        clearTimeout(timeout);
      }, 5);

      // Keep v8 from ever outsmarting this test and skipping over the loop.
      counter.should.equal(iterations);
      done();
    })
  }),
  describe("#matchFilter", function(){

  }),
  describe('#unsubscribe', function(){
    it('unsubscribes callback on both event busses', function(){
      var bubbler = new Bubbler(MOCK_STORE);
      var callback = function(){ return 1; };
      var path = '/abc';

      bubbler.$eventBus.listeners(path).length.should.equal(0);

      bubbler.subscribe(path, callback);

      bubbler.$eventBus.listeners(path).length.should.equal(1);

      bubbler.unsubscribe(path, callback);

      bubbler.$eventBus.listeners(path).length.should.equal(0);
    }),
    it('deletes tracked callback on unsubscribe', function(){
      var bubbler = new Bubbler(MOCK_STORE);
      var callback = function(){ return 1; };
      var path = '/abc';

      bubbler.subscribe(path, callback);

      _.size(bubbler.$callbacks).should.equal(1);

      bubbler.unsubscribe(path, callback);

      _.size(bubbler.$callbacks).should.equal(0);

    })
  })
  
  
});
