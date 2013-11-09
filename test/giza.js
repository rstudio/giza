var Giza = require('../lib/main.js');
var should = require('should');

describe('Giza', function(){
  describe("#Giza", function(){
    it('provides a passthrough assembler by default', function(){
      var giza = new Giza();
      giza.$assemblers['_'].name.should.equal('Passthrough');
    }),
    it('throws on non-object assemblers', function(){
      (function(){
        var giza = new Giza(5);
      }).should.throw();      
    }),
    it('throws on invalid assembler', function(){
      (function(){
        var hackedPT = new Passthrough();
        hackedPT.deserialize = null;
        var giza = new Giza({'_' : hackedPT});
      }).should.throw();      
    }),
    it('throws on non-map assemblers', function(){
      (function(){
        var pt = new Passthrough();
        var giza = new Giza([pt]);
      }).should.throw();
    })
  }),
  describe("#get", function(){
    it('subscribes a callback on get', function(done){
      var timeout = setTimeout(done, 100, new Error("Timeout"));
      
      var giza = new Giza();
      var firstCallback = true;
      giza.save('/abc', {a:1});
      giza.get('/abc', {callback: function(){
        clearTimeout(timeout);
        if(firstCallback){
          done(); //not allowed to call this multiple times.
          firstCallback=false;
        };
      }});
      giza.save('/abc');      
    })
  })  
});