var Blacklist = require('../../lib/assemblers/blacklist');
var should = require('should');

describe('Blacklist', function(){
  it ('properly serializes using regex filters', function(){
    var assem = new Blacklist(/^[^a]/);
    assem.serialize({
      a : 1, abc: {f : 1}, def: {a :1}
    }).should.eql({
      a : 1, abc: {f : 1}
    });
  }),
  it ('properly deserializes using regex filters', function(){
    var assem = new Blacklist(/^[^a]/);
    assem.deserialize({a:5, def:10},
    {
      a : 1, abc: {f : 1}, def: {a :1}
    }).should.eql({
      a : 5, abc: {f : 1}, def: {a :1}
    });
  }),
  it ('properly serializes using array filters', function(){
    var assem = new Blacklist(['def']);
    assem.serialize({
      a : 1, abc: {f : 1}, def: {a :1}
    }).should.eql({
      a : 1, abc: {f : 1}
    });
  }),
  it ('properly deserializes using array filters', function(){
    var assem = new Blacklist(['def']);
    assem.deserialize({a:5, def:10},
    {
      a : 1, abc: {f : 1}, def: {a :1}
    }).should.eql({
      a : 5, abc: {f : 1}, def: {a :1}
    });
  })
});