var assert = require("assert")
  , should = require('should')
  , vantage = require('../')
  , util = require('./util/util')
  ;

describe('vantage', function() {

  describe('constructor', function() {

    it('should exist and be a function', function() {
      should.exist(vantage);
      vantage.should.be.type('function');
    });
  
  });

});

