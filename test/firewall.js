var assert = require("assert")
  , should = require('should')
  , vantage = require('../')
  , Firewall = require('../lib/firewall')
  , util = require('./util/util')
  ;

var self = module.exports;
self.firewall = new Firewall();

describe('firewall', function() {

  beforeEach('cleanup', function(){
    self.firewall.reset();
  });

  it('should exist and be a function', function() {
    should.exist(Firewall);
    Firewall.should.be.type('function');
  });

  it('should exist as an instance', function() {
    should.exist(self.firewall);
    self.firewall.should.be.type('object');
  });

  it('should default to an accept policy', function() {
    self.firewall.policy().should.equal('ACCEPT');
  });

  it('should start with no rules', function() {
    self.firewall.rules().should.be.empty;
  });

  describe('firewall.policy', function() {
    
    it('should exist and be a function', function(){
      should.exist(self.firewall.policy);
      self.firewall.policy.should.be.type('function');
    });

    it('should correctly assign the policy', function(){
      self.firewall.policy('ACCEPT');
      self.firewall._policy.should.equal('ACCEPT');
      self.firewall.policy('REJECT');
      self.firewall._policy.should.equal('REJECT');
    });

    it('should auto-correct policy assignment variants', function(){
      self.firewall.policy('allow');
      self.firewall._policy.should.equal('ACCEPT');
      self.firewall.policy('aCCePt');
      self.firewall._policy.should.equal('ACCEPT');
      self.firewall.policy('block');
      self.firewall._policy.should.equal('REJECT');
      self.firewall.policy('deny');
      self.firewall._policy.should.equal('REJECT');
      self.firewall.policy('rEjEcT');
      self.firewall._policy.should.equal('REJECT');
    });
  
  });

  describe('firewall.accept', function() {

    it('should exist and be a function', function(){
      should.exist(self.firewall.accept);
      self.firewall.accept.should.be.type('function');
    });

    it('should add an accept rule', function(){
      self.firewall.accept('10.40.101.5');
      self.firewall.rules()[0].ip.should.equal('10.40.101.5');
      self.firewall.rules()[0].subnet.should.equal(32);
      self.firewall.rules()[0].rule.should.equal('ACCEPT');
    });

    it('should properly parse subnets', function(){
      self.firewall.accept('10.40.101.5/24');
      self.firewall.rules()[0].subnet.should.equal(24);
    });
    
    it('should throw error on invalid subnets', function(){
      (function() { self.firewall.accept('10.40.101.5/36') }).should.throw();
      (function() { self.firewall.accept('10.40.101.5/-5') }).should.throw();
      (function() { self.firewall.accept('10.40.101.5/a') }).should.throw();
    });

    it('should throw error on invalid addresses', function(){
      (function() { self.firewall.accept('10.40.5') }).should.throw();
      (function() { self.firewall.accept('300.400.500.600') }).should.throw();
      (function() { self.firewall.accept('24/10.40.101.1') }).should.throw();
    });

    it('should also accept firewall.allow as an alias', function(){
      self.firewall.allow('10.40.101.5/24');
      self.firewall.rules()[0].rule.should.equal('ACCEPT');
    });
  
  });

  describe('firewall.reject', function() {

    it('should exist and be a function', function(){
      should.exist(self.firewall.reject);
      self.firewall.reject.should.be.type('function');
    });

    it('should add a reject rule', function(){
      self.firewall.reject('10.40.101.5');
      self.firewall.rules()[0].ip.should.equal('10.40.101.5');
      self.firewall.rules()[0].subnet.should.equal(32);
      self.firewall.rules()[0].rule.should.equal('REJECT');
    });

    it('should also accept firewall.deny and firewall.block as aliases', function(){
      self.firewall.deny('10.40.101.5/24');
      self.firewall.rules()[0].rule.should.equal('REJECT');
      self.firewall.block('10.40.101.5/24');
      self.firewall.rules()[1].rule.should.equal('REJECT');
    });

  });

  describe('firewall.valid', function() {

    it('should exist and be a function', function(){
      should.exist(self.firewall.valid);
      self.firewall.valid.should.be.type('function');
    });

    it('should throw error on an invalid ip', function(){
      (function() { self.firewall.valid('foobar') }).should.throw();
      (function() { self.firewall.valid('100.4.3.800') }).should.throw();
      (function() { self.firewall.valid('10.40.101.1') }).should.not.throw();
    });

    it('should allow an address by default', function(){
      self.firewall.valid('192.168.0.1').should.equal(true);
    });

    it('should block an address by default on a REJECT policy', function(){
      self.firewall
        .policy('REJECT')
        .valid('192.168.0.1')
        .should.equal(false);
    });

    it('should block an address based on rule', function(){
      self.firewall
        .reject('192.168.0.0/16')
        .valid('192.168.0.1')
        .should.equal(false);
    });

    it('should allow an address based on rule', function(){
      self.firewall
        .policy('REJECT')
        .allow('192.168.0.0/16')
        .valid('192.168.0.1')
        .should.equal(true);
    });

    it('should pass a battery of policy tests', function(){
      
      self.firewall
        .policy('REJECT')
        .allow('0.0.0.0/0');

      self.firewall.valid('192.168.1.2').should.equal(true);
      self.firewall.valid('88.90.20.10').should.equal(true);
      (function() { self.firewall.valid('100.4.3.800') }).should.throw();

      self.firewall
        .reset()
        .policy('REJECT')
        .allow('192.0.0.0/24')
        .allow('10.1.2.36/32');

      self.firewall.valid('192.0.1.0').should.equal(false);
      self.firewall.valid('192.0.0.40').should.equal(true);
      self.firewall.valid('10.1.2.36').should.equal(true);
      self.firewall.valid('10.1.2.37').should.equal(false);
      self.firewall.valid('87.66.45.20').should.equal(false);
    });

  });

  describe('firewall commands', function() {

    it('should be chainable', function() {
      (function() { self.firewall
        .policy('REJECT')
        .accept('192.168.0.100/24')
        .deny('192.168.0.100/24')
        .block('192.168.0.100/24')
        .allow('192.168.0.100/24')
        .reject('192.168.0.100/24') }).should.not.throw();

      self.firewall.policy().should.equal('REJECT');
      self.firewall.rules().length.should.equal(5);
    });

  });

});

