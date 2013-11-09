var should = require('should'),
  PathUtil = require('../lib/core/path-util');

describe('PathUtil', function(){  
  it('properly replaces a trailing slash.', function(){
    PathUtil.cleanPath('/abc/').should.equal('/abc');
  }),
  it('throws on adjacent slashes.', function(){
    (function(){
      PathUtil.cleanPath('/abc//fde');
    }).should.throw(/consecutive slashes/);
  }),
  it('throws on non-slash-prefixed paths.', function(){
    (function(){
      PathUtil.cleanPath('abc/fde');
    }).should.throw(/must begin with/);
  })
})