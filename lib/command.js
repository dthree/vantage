
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , Option = require('./option')
  , VantageUtil = require('./util')
  ;

/**
 * Command prototype.
 */

var command = Command.prototype;

/**
 * Expose `Command`.
 */

module.exports = exports = Command;

/**
 * Initialize a new `Command` instance.
 *
 * @return {Command}
 * @api public
 */

function Command(name, parent) {
  if (!(this instanceof Command)) return new Command;  
  var slf = this;
  this.commands = [];
  this.options = [];
  this._allowUnknownOption = false;
  this._args = [];
  this._name = name;
  this._relay = false;
  this._parent = parent;
  this._mode = false;
  this._init = void 0;
}

/**
 * Calls Vantage.log.
 *
 * @param {String} log
 * @param {Object} options
 * @return {Vantage}
 * @api public
 */

command.log = function(log, options) {
  options = options || {}
  options.session = (this.session) ? this.session : options.session;
  return this._parent.log(log, options);  
}

/**
 * Propagate prompt up to parent, passing 
 * in session data.
 *
 * @param {Object} options
 * @param {Function} cb
 * @return {Command}
 * @api public
 */

command.prompt = function(options, cb) {
  options = options || {}
  var session = (this.session) ? this.session : void 0;
  this._parent.prompt(options, cb, session);  
  return this;
}

/**
 * Registers an option for given command.
 *
 * @param {String} flags
 * @param {String} description
 * @param {Function} fn
 * @param {String} defaultValue
 * @return {Command}
 * @api public
 */

command.option = function(flags, description, fn, defaultValue) {

  var self = this
    , option = new Option(flags, description)
    , oname = option.name()
    , name = _camelcase(oname);

  // default as 3rd arg
  if (typeof fn != 'function') {
    if (fn instanceof RegExp) {
      var regex = fn;
      fn = function(val, def) {
        var m = regex.exec(val);
        return m ? m[0] : def;
      }
    }
    else {
      defaultValue = fn;
      fn = null;
    }
  }

  // preassign default value only for --no-*, [optional], or <required>
  if (false == option.bool || option.optional || option.required) {
    // when --no-* we make sure default is true
    if (false == option.bool) defaultValue = true;
    // preassign only if we have a default
    if (undefined !== defaultValue) self[name] = defaultValue;
  }

  // register the option
  this.options.push(option);

  // when it's passed assign the value
  // and conditionally invoke the callback
  this.on(oname, function(val) {
    // coercion
    if (null !== val && fn) val = fn(val, undefined === self[name]
      ? defaultValue
      : self[name]);

    // unassigned or bool
    if ('boolean' == typeof self[name] || 'undefined' == typeof self[name]) {
      // if no value, bool true, and we have a default, then use it!
      if (null == val) {
        self[name] = option.bool
          ? defaultValue || true
          : false;
      } else {
        self[name] = val;
      }
    } else if (null !== val) {
      // reassign
      self[name] = val;
    }
  });

  return this;
};

/**
 * Defines an action for a given command.
 *
 * @param {Function} fn
 * @return {Command}
 * @api public
 */

command.action = function(fn) {
  var self = this;
  self._fn = fn;
  return this;
};

/**
 * Defines an init action for a mode command.
 *
 * @param {Function} fn
 * @return {Command}
 * @api public
 */

command.init = function(fn) {
  var self = this;
  if (self._mode !== true) {
    throw Error('Cannot call init from a non-mode action.'); 
    return this;
  }
  self._init = fn;
  return this;
};

/**
 * Defines a prompt delimiter for a 
 * mode once entered.
 *
 * @param {String} delimiter
 * @return {Command}
 * @api public
 */

command.delimiter = function(delimiter) {
  this._delimiter = delimiter;
  return this;
};

/**
 * Defines description for given command.
 *
 * @param {String} str
 * @return {Command}
 * @api public
 */

command.description = function(str) {
  if (0 == arguments.length) return this._description;
  this._description = str;
  return this;
}

/**
 * Returns the commands arguments as string.
 *
 * @param {String} desc
 * @return {String}
 * @api public
 */

command.arguments = function (desc) {
  return this._parseExpectedArgs(desc.split(/ +/));
}

/**
 * Returns the help info for given command.
 *
 * @return {String}
 * @api public
 */

command.helpInformation = function() {

  var desc = [];
  if (this._description) {
    desc = [
      '  ' + this._description
      , ''
    ];
  }

  var cmdName = this._name;
  if (this._alias) {
    cmdName = cmdName + '|' + this._alias;
  }
  var usage = [
    ''
    ,'  Usage: ' + cmdName + ' ' + this.usage()
    , ''
  ];

  var cmds = [];

  var options = [
    '  Options:'
    , ''
    , '' + this.optionHelp().replace(/^/gm, '    ')
    , ''
  ];

  var res = usage
    .concat(cmds)
    .concat(desc)
    .concat(options)
    .join('\n');

  return res;
};

/**
 * Returns the command usage string for help.
 *
 * @param {String} str
 * @return {String}
 * @api public
 */

command.usage = function(str) {
  var args = this._args.map(function(arg) {
    return VantageUtil.humanReadableArgName(arg);
  });

  var usage = '[options]'
    + (this.commands.length ? ' [command]' : '')
    + (this._args.length ? ' ' + args.join(' ') : '');

  if (0 == arguments.length) return this._usage || usage;
  this._usage = str;

  return this;
},

/**
 * Returns the help string for the command's options.
 *
 * @return {String}
 * @api public
 */

command.optionHelp = function() {
  var width = this._largestOptionLength();

  // Prepend the help information
  return [VantageUtil.pad('-h, --help', width) + '  ' + 'output usage information']
    .concat(this.options.map(function(option) {
      return VantageUtil.pad(option.flags, width) + '  ' + option.description;
      }))
    .join('\n');
};

/**
 * Returns the length of the longest option.
 *
 * @return {Integer}
 * @api private
 */

command._largestOptionLength = function() {
  return this.options.reduce(function(max, option) {
    return Math.max(max, option.flags.length);
  }, 0);
};

/**
 * Parses and returns expected command arguments.
 *
 * @param {String} args
 * @return {Array}
 * @api private
 */

command._parseExpectedArgs = function(args) {
  if (!args.length) return;
  var self = this;
  args.forEach(function(arg) {
    var argDetails = {
      required: false,
      name: '',
      variadic: false
    };

    switch (arg[0]) {
      case '<':
        argDetails.required = true;
        argDetails.name = arg.slice(1, -1);
        break;
      case '[':
        argDetails.name = arg.slice(1, -1);
        break;
    }

    if (argDetails.name.length > 3 && argDetails.name.slice(-3) === '...') {
      argDetails.variadic = true;
      argDetails.name = argDetails.name.slice(0, -3);
    }
    if (argDetails.name) {
      self._args.push(argDetails);
    }
  });
  return this;
};

/**
 * Converts string to camel case.
 *
 * @param {String} flag
 * @return {String}
 * @api private
 */

function _camelcase(flag) {
  return flag.split('-').reduce(function(str, word) {
    return str + word[0].toUpperCase() + word.slice(1);
  });
}

/**
 * Make command an EventEmitter.
 */

command.__proto__ = EventEmitter.prototype;

