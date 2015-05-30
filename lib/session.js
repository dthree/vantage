var EventEmitter = require('events').EventEmitter
  , _ = require('lodash')
  ;

module.exports = exports = Session;

Session.prototype.__proto__ = EventEmitter.prototype;

function Session(name, slave) {
  
  var slf = this;

  this.relay = false;
  this.stdout = '';
  this.id = Math.random();

  return this;

}

