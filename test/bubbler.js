var Bubbly = require('../lib/main');
var should = require('should');
var bub;

describe('Bubbler', function(){
  beforeEach(function(){
    bub = new Bubbly();
  }),
  it('properly subscribes and emits on a particular node.', function(done){
    var obj = {a:1};
    bub.subscribe('/abc/def', false, function(data){
      should(data).equal(obj);
      done();
    });
    bub.emit('/abc/def', obj);
  }),
  it('replaces trailing slash on subscribe', function(done){
    var obj = {a:1};
    bub.subscribe('/abc/def/', false, function(data){
      should(data).equal(obj);
      done();
    });
    bub.emit('/abc/def', obj);
  }),
  it('replaces trailing slash on emit', function(done){
    var obj = {a:1};
    bub.subscribe('/abc/def', false, function(data){
      should(data).equal(obj);
      done();
    });
    bub.emit('/abc/def/', obj);
  }),
  it('bubbles events upwards.', function(done){
    var obj = {a:1};
    bub.subscribe('/abc', true, function(data){
      should(data).equal(obj);
      done();
    });
    bub.emit('/abc/def/', obj);
  }),
  it('skips bubbled events if not subscribed', function(done){
    setTimeout(done, 100);

    var obj = {a:1};
    bub.subscribe('/abc', false, function(data){
      done(new Error("Bubbled event when it shouldn't have."));
    });
    bub.emit('/abc/def/', obj);
  }),
  it('bubbles events to root.', function(done){
    var obj = {a:1};
    bub.subscribe('/', true, function(data){
      should(data).equal(obj);
      done();
    });
    bub.emit('/abc/def/', obj);
  }),
  it('pub/subs 100k targeted events in less than 200ms', function(done){
    // this.timeout doesn't seem to be working. Implement our own.
    var timeout = setTimeout(done, 200, new Error("Took too long."));

    var counter = 0;
    var obj = {a:1};
    bub.subscribe('/abc', false, function(data){
      counter++;
    });    

    var iterations = 100000;

    for (var i = 0; i < iterations; i++){
      bub.emit('/abc', obj);
    }

    // We made it in time. Clear the timeout
    clearTimeout(timeout);

    // Keep v8 from ever outsmarting this test and skipping over the loop.
    counter.should.equal(iterations);
    done();
  })
  it('pub/subs 100k (5-lvl) bubbled events in less than 500ms', function(done){
    // this.timeout doesn't seem to be working. Implement our own.
    var timeout = setTimeout(done, 500, new Error("Took too long."));

    var counter = 0;
    var obj = {a:1};
    bub.subscribe('/', true, function(data){
      counter++;
    });

    var iterations = 100000;

    for (var i = 0; i < iterations; i++){
      bub.emit('/abc/def/ghi/jkl', obj);
    }

    // We made it in time. Clear the timeout
    clearTimeout(timeout);

    // Keep v8 from ever outsmarting this test and skipping over the loop.
    counter.should.equal(iterations);
    done();
  });
});