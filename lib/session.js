
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  ;

/**
 * Session prototype.
 */

var session = Session.prototype;

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

function Session(options) {
  var slf = this
    , options = options || {}
    ;

  this.id = options.id || this._guid();
  this.parent = options.parent || void 0;
  this.authenticating = options.authenticating || false;
  this.authenticated = options.authenticated || void 0;
  this._isLocal = options.local || void 0;

  // Special command mode vantage is in at the moment,
  // such as REPL. See mode documentation.
  this._mode = void 0;

  console.log("New session. Id: ", this.id)

  return this;
}

session.log = function(str) {
	var self = this;
	if (this._isLocal) {
		console.log(str);
	} else {
    self.parent._send("vantage-ssn-stdout-downstream", "downstream", { sessionId: self.id, value: str });
	}
}

session.isLocal = function() {
	return this._isLocal;
}

session.prompt = function(options, cb) {
	options = options || {}
	options.sessionId = this.id;
	return this.parent.prompt(options, cb);
}

session.exit = function() {

}

session._guid = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}
