var assert = require("assert")
  , should = require('should')
  , Vantage = require('../')
  , util = require('./util/util')
  , self = module.exports
  ;

describe('vantage client', function() {

  it('should create an instance from a constructor', function() {
    self.vantage = new Vantage();
    should.exist(self.vantage);
    self.vantage.should.be.type('object');
  });

  it('should create an instance without the `new` keyword', function() {
    self.vantage = Vantage();
    should.exist(self.vantage);
    self.vantage.should.be.type('object');
  });

  it('should register a command and a description', function() {
    (function() {
      self.vantage.command("foo").description("Should return 'bar'.");
    }).should.not.throw();
  });

  it('should register a command, description and action.', function() {
    (function() {
      self.vantage
        .command("foo", "Should return 'bar'.")
        .action(function(args, cb){
          cb();
        })
    }).should.not.throw();
  });

});

