
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  ;

/**
 * Expose `Session`.
 */

module.exports = exports = Session;

/**
 * Extend Session prototype as an event emitter.
 */

Session.prototype.__proto__ = EventEmitter.prototype;

/**
 * Initialize a new `Session` instance.
 *
 * @param {String} name
 * @return {Session}
 * @api public
 */

function Session(name) {
  var slf = this;
  this.relay = false;
  this.stdout = '';
  this.id = Math.random();
  return this;
}
