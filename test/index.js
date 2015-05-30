var assert = require("assert")
  , should = require('should')
  , vantage = require('../')
  ;

describe('vantage', function(){
  
  describe('constructor', function(){

  	it('should exist and be an object', function(){
	    should.exist(vantage);
	    vantage.should.be.type('object');
  	});

  });

});
