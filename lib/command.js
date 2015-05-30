var EventEmitter = require('events').EventEmitter
  , inquirer = require('inquirer')
  , Option = require('./option')
  , _ = require('lodash')
  , colors = require('colors')
  , commander = require('commander')
  ;

module.exports = exports = Command;

function init() {

}



function Command(name, parent) {
  
  var slf = this;
  this.commands = [];
  this.options = [];
  this._allowUnknownOption = false;
  this._args = [];
  this._name = name;
  this._relay = false;
  this._parent = parent;

}

Command.prototype.log = function(log, options) {
  options = options || {}
  options.session = (this.session) ? this.session : options.session;
  if (this.session) {
    //console.log('OMG SESSION', this.session);
  }
  return this._parent.log(log, options);  
}

// Propagate prompt up to parent, passing in session data.
Command.prototype.prompt = function(options, cb) {
  options = options || {}
  var session = (this.session) ? this.session : void 0;
  this._parent.prompt(options, cb, session);  
  return this;
}

Command.prototype.option = function(flags, description, fn, defaultValue) {

  var self = this
    , option = new Option(flags, description)
    , oname = option.name()
    , name = camelcase(oname);

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

Command.prototype.action = function(fn) {
  var self = this;
  self._fn = fn;
  return this;
};

Command.prototype.description = function(str) {
  if (0 == arguments.length) return this._description;
  this._description = str;
  return this;
}

Command.prototype.arguments = function (desc) {
  return this._parseExpectedArgs(desc.split(/ +/));
}

//Command.prototype.pad = pad;

Command.prototype.__proto__ = EventEmitter.prototype;

Command.prototype.helpInformation = function() {

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
  //var commandHelp = this.commandHelp();
  //if (commandHelp) cmds = [commandHelp];

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

Command.prototype.usage = function(str) {
  var args = this._args.map(function(arg) {
    return _humanReadableArgName(arg);
  });

  var usage = '[options]'
    + (this.commands.length ? ' [command]' : '')
    + (this._args.length ? ' ' + args.join(' ') : '');

  if (0 == arguments.length) return this._usage || usage;
  this._usage = str;

  return this;
},



Command.prototype.optionHelp = function() {
  var width = this.largestOptionLength();

  // Prepend the help information
  return [pad('-h, --help', width) + '  ' + 'output usage information']
    .concat(this.options.map(function(option) {
      return pad(option.flags, width) + '  ' + option.description;
      }))
    .join('\n');
};


Command.prototype.largestOptionLength = function() {
  return this.options.reduce(function(max, option) {
    return Math.max(max, option.flags.length);
  }, 0);
};


Command.prototype._parseExpectedArgs = function(args) {
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

function camelcase(flag) {
  return flag.split('-').reduce(function(str, word) {
    return str + word[0].toUpperCase() + word.slice(1);
  });
}

function outputHelpIfNecessary(cmd, options) {
  options = options || [];
  for (var i = 0; i < options.length; i++) {
    if (options[i] == '--help' || options[i] == '-h') {
      cmd.outputHelp();
      process.exit(0);
    }
  }
}

function exists(file) {
  try {
    if (fs.statSync(file).isFile()) {
      return true;
    }
  } catch (e) {
    return false;
  }
}

// needed
function _humanReadableArgName(arg) {
  var nameOutput = arg.name + (arg.variadic === true ? '...' : '');

  return arg.required
    ? '<' + nameOutput + '>'
    : '[' + nameOutput + ']'
}


// Needed
function pad(str, width, delimiter) {
    delimiter = delimiter || ' ';
    var len = Math.max(0, width - str.length);
    return str + Array(len + 1).join(' ');
}




init();