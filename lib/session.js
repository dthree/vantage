
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , os = require("os")
  , _ = require("lodash")
  , chalk = require("chalk")
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
  this.user = options.user || "guest";
  this.host = options.host;
  this.address = options.address || void 0;
  this._isLocal = options.local || void 0;
  this._delimiter = options.delimiter || String(os.hostname()).split(".")[0] + "~$";
  this._modeDelimiter = void 0;

  // Prompt Command History
  // Histctr moves based on number of times "up" (+= ctr)
  //  or "down" (-= ctr) was pressed in traversing 
  // command history.
  this._hist = [];
  this._histCtr = 0;

  // When in a "mode", we reset the 
  // history and store it in a cache until
  // exiting the "mode", at which point we 
  // resume the original history.
  this._histCache = [];
  this._histCtrCache = 0;

  // Special command mode vantage is in at the moment,
  // such as REPL. See mode documentation.
  this._mode = void 0;

  return this;
}

session.log = function() {
	var self = this;
	if (this.isLocal()) {
    this.parent.ui.log.apply(this.parent.ui, arguments);
	} else {
    // If it's an error, expose the stack. Otherwise
    // we get a helpful "{}".
    var args = [];
    for (var i = 0; i < arguments.length; ++i) {
      var str = arguments[i];
      str = (str && str.stack) ? "Error: " + str.message : str;
      args.push(str);
    }
    // If it's any other object, stringify it.
    //str = (_.isObject(str)) ? JSON.stringify(str) : str;
    self.parent._send("vantage-ssn-stdout-downstream", "downstream", { sessionId: self.id, value: args });
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

session.fullDelimiter = function() {
  var result = this._delimiter
   + ((this._modeDelimiter !== undefined) ? this._modeDelimiter : "");
  return result;
}

session.delimiter = function(str) {
  if (str === undefined) {
    return this._delimiter;
  } else {
    this._delimiter = String(str).trim() + " ";
    this.parent.ui.refresh();
    return this;
  }
}

session.modeDelimiter = function(str) {
  var self = this;
  if (str === undefined) {
    return this._modeDelimiter;
  } else {
    if (!this.isLocal()) {
      self.parent._send("vantage-mode-delimiter-downstream", "downstream", { value: str, sessionId: self.id, value: str });
    } else {
      if (str === false || str === "false") {
        this._modeDelimiter = void 0;
      } else {
        this._modeDelimiter = String(str).trim() + " ";
      }
      this.parent.ui.refresh();
    }
    return this;
  }
}

/**
 * Helper for vantage._keypressHandler.
 *
 * @param {String} key
 * @param {String} value
 * @return {Function}
 * @api private
 */

session.getKeypressResult = function(key, value) {
  var keyMatch = (["up", "down", "tab"].indexOf(key) > -1);
  if (keyMatch) {
    if (["up", "down"].indexOf(key) > -1) {
      return this.getHistory(key);
    } else if (key == "tab") {
      return str = this._getAutocomplete(value);
    }
  } else {
    this._histCtr = 0;
  }
};

session.history = function(str) {
  var exceptions = [];
  if (str && exceptions.indexOf(String(str).toLowerCase()) == -1) {
    this._hist.push(str);
  }
};


/**
 * Handles tab-completion. Takes a partial
 * string as "he" and fills it in to "help", etc.
 * Works the same as a linux terminal's auto-complete.
 *
 * @param {String} str
 * @return {String} 
 * @api private
 */

session._getAutocomplete = function(str) {
  var names = _.pluck(this.parent.commands, "_name");
  var auto = this._autocomplete(str, names);
  return auto;
};

/**
 * Independent / stateless auto-complete function.
 * Parses an array of strings for the best match.
 *
 * @param {String} str
 * @param {Array} arr
 * @return {String} 
 * @api private
 */

session._autocomplete = function(str, arr) {
  arr.sort();
  var arrX = _.clone(arr);
  var strX = String(str);

  var go = function() {
    var matches = [];
    for (var i = 0; i < arrX.length; i++) {
      if (arrX[i].slice(0, strX.length).toLowerCase() == strX.toLowerCase()) {
        matches.push(arrX[i]);
      }
    }
    if (matches.length == 1) {
      return matches[0] + " ";
    } else if (matches.length == 0) {
      return void 0;
    } else {
      var furthest = strX;
      for (var i = strX.length; i < matches[0].length; ++i) {
        var curr = String(matches[0].slice(0, i)).toLowerCase();
        var same = 0;
        for (var j = 0; j < matches.length; ++j) {
          var sliced = String(matches[j].slice(0, curr.length)).toLowerCase();
          if (sliced == curr) {
            same++;
          }
        }
        if (same == matches.length) {
          furthest = curr;
          continue;
        } else {
          break;
        }
      }
      if (furthest != strX) {
        return furthest;
      } else {
        return void 0;
      }
    }
  }

  return go();
};


/**
 * Returns the appropriate command history
 * string based on an 'Up' or 'Down' arrow
 * key pressed by the user.
 *
 * @param {String} direction
 * @return {String} 
 * @api private
 */

session.getHistory = function(direction) {
  if (direction == "up") {
    this._histCtr++;
    this._histCtr = (this._histCtr > this._hist.length) ? this._hist.length : this._histCtr;
  } else if (direction == "down") {
    this._histCtr--;
    this._histCtr = (this._histCtr < 1) ? 1 : this._histCtr;
  }
  return this._hist[this._hist.length-(this._histCtr)];
};

session._guid = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}
