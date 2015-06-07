
/**
 * Module dependencies.
 */

var _ = require('lodash')
  , EventEmitter = require('events').EventEmitter
  , Command = require('./lib/command')
  , VantageServer = require('./lib/server')
  , VantageClient = require('./lib/client')
  , VantageUtil = require('./lib/util')
  , commons = require('./lib/vantage-commons')
  , commander = require('commander')
  , inquirer = require('inquirer')
  , minimist = require('minimist')
  ;

/**
 * Vantage prototype.
 */

var vantage = Vantage.prototype;

/**
 * Expose `Vantage`.
 */

exports = module.exports = Vantage;

/**
 * Handles vantage when run as a program
 * as opposed to being imported into an application.
 * Connects to a Node application running an
 * instance of Vantage.
 *
 * @api public
 */

function init() {

  var cmdValue, envValue, script, options = {}, self = this;

  script = String(process.argv[1]).split('/');
  script = script[script.length-1].split('\\');
  script = String(script[script.length-1] || '');

  if (script.indexOf('vantage') > -1) {

    commander
      .version('0.0.1')
      .arguments('[server]')
      .option('-s, --ssl', "Connect using SSL.")
      .action(function(cmd, env){
        cmdValue = cmd;
        envValue = env;
      });

    commander.parse(process.argv);

    if (typeof cmdValue === 'undefined' && 1 == 2) {
      self.log('\n  Please specify a server and a port.');
      self.log('\n  Example: vantage 192.168.0.1:3000.\n')
      process.exit(1);
    } else {

      if (envValue && envValue.ssl === true) {
        options.ssl = true;
      }

      var str = (!cmdValue) ? '' : cmdValue;

      var parts = String(str).split(':');

      var port = (parts.length == 2) ? parts[1] : void 0;
      var server = (parts.length == 2) ? parts[0] : void 0;

      if (parts.length == 1) {
        server = (String(parts[0]).split('.').length == 4) ? parts[0] : void 0;
        port = (String(parts[0]).length < 6 && !isNaN(parts[0])) ? parts[0] : void 0;
      }

      server = (!server) ? '127.0.0.1' : server;
      port = (!port) ? '80' : port;
      
      if (String(server).split('.').length !== 4 || isNaN(port)) {
        self.log('\n  Invalid server/port passed: ' + server + ':' + port + '\n');
        process.exit(1);
      }

      return new Vantage().client.connect(server, port, options);
    }
  }

  return self;
};

/**
 * Initialize a new `Vantage` instance.
 *
 * @return {Vantage}
 * @api public
 */

function Vantage() {

  // Program version
  // Exposed through vantage.version(str);
  this._version = '';

  // Registered `vantage.command` commands and 
  // their options.
  this.commands = [];

  // Prompt delimiter.
  // Exposed through vantage.delimiter(str).
  this._delimiter = 'local~$';
  this._origdelimiter = 'local~$';

  // Prompt Command History
  // Histctr moves based on number of times 'up' (+= ctr)
  //  or 'down' (-= ctr) was pressed in traversing 
  // command history.
  this._hist = [];
  this._histCtr = 0;

  // Hook to reference active inquirer prompt.
  this._activePrompt;

  // Determines whether or not to show a prompt on the
  // local Vantage server terminal. Exposed through
  // Vantage.show();
  this._isSilent = true;

  // Fail-safe to ensure there is no double 
  // prompt in odd situations.
  this._midPrompt = false;

  // Vantage client connects to other instances
  // of Vantage.
  this.client = new VantageClient(this);
  
  // Vantage server receives connections from
  // other vantages. Activated by vantage.listen();
  this.server = new VantageServer(this);

  // If one uses vantage to connect
  // into another session, they are a 'client'.
  // If Vantage is receiving a client and piping the
  // response through to it, it is a 'server'.
  // A Vantage instance can be both a client and
  // server in the instance that one is double-hopping
  // through Vantage instances.
  // Exposed through vantage.is('client/server', [setter]).
  this._isClient = false;
  this._isServer = false;
  this._isTerminable = false;

  // Handle for inquirer's prompt. 
  this.inquirer = inquirer;

  // Middleware for piping stdout through.
  this._pipeFn = void 0;

  // Queue of IP requests, executed async, in sync.
  // Yeah, that doesn't make much sense. But it works.
  this._queue = [];

  // Current command being executed.
  this._command = void 0;

  this._init();
  return this;
}

/**
 * Extension to `constructor`.
 * @api private
 */

Vantage.prototype._init = function() {
  var self = this;
  inquirer.prompt.prompts.input.prototype.onKeypress = function(e) {
    return self._keypressHandler(e, this);
  };
  self.events = new EventEmitter();
  self.use(commons);
};

/**
 * Sets version of your application's API.
 *
 * @param {String} version
 * @return {Vantage}
 * @api public
 */

vantage.version = function(version) {
  this._version = version;
  return this;
};

/**
 * Sets the permanent delimiter for this
 * Vantage server instance.
 *
 * @param {String} str
 * @return {Vantage}
 * @api public
 */

vantage.delimiter = function(str) {
  var slf = this;
  this._delimiter = String(str).trim() + ' ';
  this._origdelimiter = String(str).trim() + ' ';
  inquirer.prompt.prompts.input.prototype.prefix = function() {
    return slf._delimiter;
  }
  return this;
};

/**
 * Sets the temporarily delimiter based
 * on the delimiter provided by another
 * vantage server to this instance's client
 * upon the establishment of a session.
 *
 * @param {String} str
 * @api private
 */

vantage._tempDelimiter = function(str) {
  var self = this;
  this._delimiter = String(str || '').trim() + ' ';
  inquirer.prompt.prompts.input.prototype.prefix = function() {
    return self._delimiter;
  }
};

/**
 * Getter / Setter for Vantage's role, i.e.
 * a client, server, proxy, etc.
 *
 * @param {String} role
 * @param {Boolean} setter
 * @api private
 */

vantage.is = function(role, setter) {
  this._isClient = (role == 'client' && setter !== undefined) ? setter : this._isClient;
  this._isServer = (role == 'server' && setter !== undefined) ? setter : this._isServer;
  this._isTerminable = (role == 'terminable' && setter !== undefined) ? setter : this._isTerminable;

  var response = 
   (role == 'terminable' && this._isTerminable) ? true : 
   (role == 'local' && (!this._isServer && !this._isClient)) ? true : 
   (role == 'local' && (this._isClient && this._isTerminable)) ? true : 
   (role == 'local') ? false : 
   (role == 'proxy' && this._isClient && this._isServer) ? true : 
   (role == 'proxy') ? false : 
   (role == 'client') ? this._isClient : 
   (role == 'server') ? this._isServer : false;

  return response;
};

/**
 * Programatically connect to another server 
 * instance running Vantage.
 *
 * @param {Server} server
 * @param {Integer} port
 * @param {Object} options
 * @param {Function} cb
 * @return {Promise}
 * @api public
 */

vantage.connect = function(server, port, options, cb) {
  return this.client.connect(server, port, options, cb);
};

/**
 * Imports a library of Vantage API commands
 * from another Node module as an extension
 * of Vantage.
 *
 * @param {Array} commands
 * @return {Vantage}
 * @api public
 */

vantage.use = function(commands) {
  commands = _.isArray(commands) ? commands : [commands];
  for (var i = 0; i < commands.length; ++i) {
    var cmd = commands[i];
    if (cmd.command) {
      var command = this.command(cmd.command);
      if (cmd.description) {
        command.description(cmd.description);
      }
      if (cmd.options) {
        cmd.options = _.isArray(cmd.options) ? cmd.options : [cmd.options];
        for (var j = 0; j < cmd.options.length; ++j) {
          command.option(cmd.options[j][0], cmd.options[j][1]);
        }
      }
      if (cmd.action) {
        command.action(cmd.action);
      }
    }
  }
  return this;
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

vantage._getHistory = function(direction) {
  if (direction == 'up') {
    this._histCtr++;
    this._histCtr = (this._histCtr > this._hist.length) ? this._hist.length : this._histCtr;
  } else if (direction == 'down') {
    this._histCtr--;
    this._histCtr = (this._histCtr < 1) ? 1 : this._histCtr;
  }
  return this._hist[this._hist.length-(this._histCtr)];
};

/**
 * Handles tab-completion. Takes a partial
 * string as 'he' and fills it in to 'help', etc.
 * Works the same as a linux terminal's auto-complete.
 *
 * @param {String} str
 * @return {String} 
 * @api private
 */

vantage._getAutocomplete = function(str) {
  var names = _.pluck(this.commands, "_name");
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

vantage._autocomplete = function(str, arr) {
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
      return matches[0] + ' ';
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
 * Redraws the inquirer prompt with a new string.
 *
 * @param {Prompt} prompt
 * @param {String} str
 * @return {Vantage} 
 * @api private
 */

vantage._redraw = function(prompt, str) {
  prompt.rl.line = str;
  prompt.rl.cursor = str.length;
  prompt.cacheCursorPos();
  prompt.clean().render().write( prompt.rl.line );
  prompt.restoreCursorPos();
  return this;
};

/**
 * Writes to console or, if `vantage.pipe` is
 * called, pipes out to a function first.
 *
 * @param {String} log
 * @return {Vantage} 
 * @api public
 */

vantage.log = function(log) {
  log = (_.isArray(log)) ? log : [log];
  for (var i = 0; i < log.length; ++i) {
    if (this._pipeFn !== undefined) {
      // If the user has declared a pipe function,
      // pass the data through the pipe, and if
      // the user returned text, log it.
      var result = this._pipeFn.call(this, log[i]);
      if (result) {
        console.log(result);
      }
    } else {
      // Otherwise, just log the data.
      console.log(log[i]);
    }
  }
  return this;
};

/**
 * Intercepts all logging through `vantage.log`
 * and runs it through the function declared by
 * `vantage.pipe()`.
 *
 * @param {Function} fn
 * @return {Vantage} 
 * @api public
 */

vantage.pipe = function(fn){
  this._pipeFn = fn;
  return this;
};

/**
 * Registers a new command in the vantage API.
 *
 * @param {String} name
 * @param {String} desc
 * @param {Object} opts
 * @return {Command} 
 * @api public
 */

vantage.command = function(name, desc, opts) {
  opts = opts || {};
  name = String(name);

  var args = 
    (name.indexOf('[') > -1) ? name.split('[') : 
    (name.indexOf('<') > -1) ? name.split('<') : [name];

  if (args[1]) {
    args[1] = (String(args[1]).indexOf(']') > -1) ? '[' + args[1] : args[1];
    args[1] = (String(args[1]).indexOf('>') > -1) ? '<' + args[1] : args[1];
  }

  var cmd = new Command(String(args.shift()).trim(), exports);
  if (desc) {
    cmd.description(desc);
    this.executables = true;
  }
  cmd._noHelp = !!opts.noHelp;
  this.commands.push(cmd);
  cmd._parseExpectedArgs(args);
  cmd.parent = this;
  if (desc) return this;
  return cmd;
};

/**
 * Enables the vantage prompt on the 
 * local terminal.
 *
 * @return {Vantage} 
 * @api public
 */

vantage.show = function() {
  this._isSilent = false;
  this._prompt();
  return this;
};

/**
 * Disables the vantage prompt on the 
 * local terminal.
 *
 * @return {Vantage} 
 * @api public
 */

vantage.hide = function() {
  this._isSilent = true;
  return this;
};

/**
 * For use in vantage API commands, sends
 * a prompt command downstream to the local
 * terminal. Executes a prompt and returns
 * the response upstream to the API command.
 *
 * @param {Object} options
 * @param {Function} cb
 * @return {Vantage} 
 * @api public
 */

vantage.prompt = function(options, cb) {
  var self = this;
  options = options || {}

  if (self.is('local')) {
    self._tempDelimiter((options.message) ? options.message : self._delimiter);
    inquirer.prompt(options, function(result) {
      self._tempDelimiter(self._origdelimiter);
      cb(result);
    });
  } else {

    self.events.on('vantage-prompt-upstream', function(data){
      var response = data.value;
      cb(response);
    });

    self._send('vantage-prompt-downstream', 'downstream', { options: options, value: void 0 });
  }
  return self;
};

/**
 * Renders the CLI prompt or sends the
 * request to do so downstream.
 *
 * @return {Vantage} 
 * @api private
 */

vantage._prompt = function() {
  var self = this;

  // If we somehow got to _prompt and aren't the 
  // local client, send the command downstream.
  if (this.is('server')) {
    this._send('vantage-resume-downstream', 'downstream'); 
    return;
  }

  // ... we just don't show prompts - for automation.
  if (self._isSilent === true) {
    return;  
  } 

  // If we double up on a prompt, chill out.
  if (this._midPrompt) { return; }
  this._midPrompt = true;

  inquirer.prompt({
    type: "input",
    name: "command",
    message: this._delimiter,
  }, function(result){

    self._midPrompt = false;

    var str = String(result.command).trim();
    if (str == '') { self._prompt(); return; }

    self.exec(str, function(){
      self._prompt();
    });
  });
  return self;
};

/**
 * Executes a vantage API command and
 * returns the response either through a 
 * callback or Promise in the absence
 * of a callback.
 *
 * A little black magic here - because 
 * we sometimes have to send commands 10
 * miles upstream through 80 other instances
 * of vantage and we aren't going to send 
 * the callback / promise with us on that 
 * trip, we store the command, callback,
 * resolve and reject objects (as they apply)
 * in a local vantage._command variable.
 *
 * When the command eventually comes back 
 * downstream, we dig up the callbacks and 
 * finally resolve or reject the promise, etc.
 * 
 * Lastly, to add some more complexity, we throw 
 * command and callbacks into a queue that will 
 * be unearthed and sent in due time.
 *
 * @param {String} cmd
 * @param {Function} cb
 * @return {Promise or Vantage} 
 * @api public
 */

vantage.exec = function(cmd, cb) {
  var self = this;
  var command = {
    command: cmd,
    callback: cb,
  }
  if (cb !== undefined) {
    self._queue.push(command);
    self._queueHandler.call(self);
    return self;
  } else {
    return new Promise(function(resolve, reject) {
      command.resolve = resolve;
      command.reject = reject;
      self._queue.push(command);
      self._queueHandler.call(self);
    });
  }
};

/**
 * Commands issued to Vantage server
 * are executed in sequence. Called once
 * when a command is inserted or completes,
 * shifts the next command in the queue  
 * and sends it to `vantage._execQueueItem`.
 *
 * @api private
 */

vantage._queueHandler = function() {
  if (this._queue.length > 0 && this._command === undefined) {
    var item = this._queue.shift();
    this._execQueueItem(item);
  }
};

/**
 * Fires off execution of a command - either
 * calling upstream or executing locally.
 *
 * @param {Object} cmd
 * @api private
 */

vantage._execQueueItem = function(cmd) {
  var self = this;
  if (self.is('local')) {
    this._exec(cmd);
  } else {
    self._command = cmd;
    self._send('vantage-command-upstream', 'upstream', { command: cmd.command, completed: false });
  };
};

/**
 * Executes a vantage API command.
 * Warning: Dragons lie beyond this point.
 *
 * @param {String} item
 * @api private
 */

vantage._exec = function(item) {
  item = item  || {}
  item.command = item.command || '';
  var self = this;
  var parts = item.command.split(' ');
  var path = [];
  var match = false;
  var args;

  // History for our 'up' and 'down' arrows.
  this._hist.push(item.command);

  // Reverse drill-down the string until you find the
  // first command match.
  for (var i = 0; i < parts.length; ++i) {
    var subcommand = String(parts.slice(0, parts.length-i).join(' ')).trim().toLowerCase();
    match = _.findWhere(this.commands, { _name: subcommand }) || match;
    if (match) { 
      args = parts.slice(parts.length-i, parts.length).join(' ');
      break; 
    }
  }

  // This basically makes the arguments human readable.
  var parsedArgs = minimist(VantageUtil.parseArgs(args));
  parsedArgs['_'] = parsedArgs['_'] || [];
  var args = {}

  // Match means we found a suitable command.
  if (match) {

    var fn = match._fn;
    var origArgs = match._args;
    var origOptions = match.options;
    args.options = {}

    // Looks for a help arg and throws help if any.
    if (parsedArgs.help || parsedArgs.h || parsedArgs['_'].indexOf('/?') > -1) {
      self.log(match.helpInformation());
      item.callback(); return;
    } 

    // looks for ommitted required args 
    // and throws help.
    for (var i = 0; i < origArgs.length; ++i) {
      var exists = parsedArgs._[i];
      if (!exists && origArgs[i].required === true) {
        self.log(" ");
        self.log("  Missing required argument. Showing Help:");
        self.log(match.helpInformation());
        item.callback(); return;
      }
      if (exists) {
        args[origArgs[i].name] = exists;
      }
    }

    // Looks for ommitted required options 
    // and throws help.
    for (var i = 0; i < origOptions.length; ++i) {
      var o = origOptions[i];
      var short = String(o.short || '').replace(/-/g, '');
      var long = String(o.long || '').replace(/--no-/g, '').replace(/-/g, '');
      var flag = String(o.flags).slice(Math.abs(o.required), o.flags.length).replace('>', '').trim();
      var exists = parsedArgs[short] || parsedArgs[long];
      if (exists === undefined && o.required !== 0) {
        self.log(" ");
        self.log("  Missing required option. Showing Help:");
        self.log(match.helpInformation());
        item.callback('Missing required option.');
        return;
      }
      if (exists !== undefined) {
        args.options[long || short] = exists;
      }
    }

    // Warning: Do not touch unless you have a 
    // really good understand of callbacks and 
    // Promises (I don't).

    // So what I think I made this do, is call the
    // function declared in the command's .action()
    // method. 

    // If calling it seems to return a Promise, we 
    // are going to guess they didn't call the 
    // callback we passed in. 
    
    // If the 'action' function didn't throw an
    // error, call the `exec`'s callback if it 
    // exists, and call it's `resolve` if its a
    // Promise.

    // If the `action` function threw an error, 
    // callback with the error or reject the Promise.
    
    var res = fn.call(this, args, item.callback);
    if (res && _.isFunction(res.then)) {
      return res.then(function(data){
        if (item.callback !== undefined) { 
          item.callback(data); 
        } else if (item.resolve !== undefined) { 
          return item.resolve(data); 
        }
      }).catch(function(err) {
        self.log(['', '  Error: '.red + err, '']);
        if (item.callback !== undefined) {
          item.callback(err);
        } else if (item.reject !== undefined) {
          item.reject(err);
        }
      });
    }
  } else {
    // If no command match, just return.
    self.log(this._commandHelp(item.command));

    // To do - if `exec` uses Promises, 
    // I think we need to return a promise here...
    item.callback();
  }
};

/**
 * Returns help string for a given command.
 *
 * @param {String} command
 * @api private
 */

vantage._commandHelp = function(command) {
  if (!this.commands.length) return '';

  var self = this;
  var matches = [];
  var singleMatches = [];

  command = (command) ? String(command).trim().toLowerCase() : void 0;
  for (var i = 0; i < this.commands.length; ++i) {
    var parts = String(this.commands[i]._name).split(' ');
    if (parts.length == 1 && parts[0] == command) { singleMatches.push(command) }
    var str = '';
    for (var j = 0; j < parts.length; ++j) {
      str = String(str + ' ' + parts[j]).trim();
      if (str == command) {
        matches.push(this.commands[i]);
        break;
      }
    }
  }

  var invalidString = 
    (command && matches.length == 0 && singleMatches.length == 0) 
    ? ['', "  Invalid Command. Showing Help:", ''].join('\n')
    : '';

  var commandMatch = (matches.length > 0) ? true : false;
  var commandMatchLength = (commandMatch) ? String(command).trim().split(' ').length+1 : 1;
  matches = (matches.length == 0) ? this.commands : matches;

  var commands = matches.filter(function(cmd) {
    return !cmd._noHelp;
  }).filter(function(cmd){
    return (String(cmd._name).trim().split(' ').length <= commandMatchLength);
  }).map(function(cmd) {
    var args = cmd._args.map(function(arg) {
      return VantageUtil.humanReadableArgName(arg);
    }).join(' ');

    return [
      cmd._name
        + (cmd._alias
          ? '|' + cmd._alias
          : '')
        + (cmd.options.length
          ? ' [options]'
          : '')
        + ' ' + args
    , cmd.description()
    ];
  });

  var width = commands.reduce(function(max, command) {
    return Math.max(max, command[0].length);
  }, 0);

  var counts = {};

  var groups = _.uniq(matches.filter(function(cmd) {
    return (String(cmd._name).trim().split(' ').length > commandMatchLength);
  }).map(function(cmd){
    return String(cmd._name).split(' ').slice(0, commandMatchLength).join(' ');
  }).map(function(cmd){
    counts[cmd] = counts[cmd] || 0;
    counts[cmd]++;
    return cmd;
  })).map(function(cmd){
    return '    ' + VantageUtil.pad(cmd + ' *', width) + '  ' + counts[cmd] + ' sub-command' + ((counts[cmd] == 1) ? '' : 's') + '.';
  });

  var str = [
      invalidString + '\n  Commands:'
    , ''
    , commands.map(function(cmd) {
      return VantageUtil.pad(cmd[0], width) + '  ' + cmd[1];
    }).join('\n').replace(/^/gm, '    ')
    , (groups.length < 1 
      ? ''
      : '\n  Command Groups:\n\n' + groups.join('\n') + '\n')
  ].join('\n');

  return str;
};

/**
 * Abstracts the logic for sending and
 * receiving sockets upstream and downstream.
 *
 * To do: Has the start of logic for vantage sessions, 
 * which I haven't fully confronted yet.
 *
 * @param {String} str
 * @param {String} direction
 * @param {String} data
 * @param {Object} options
 * @api private
 */

vantage._send = function(str, direction, data, options) {
  options = options || {}
  if (direction == 'upstream') {
    this.client.io.emit(str, data);
  } else if (direction == 'downstream') {
    if (options.sessionId) {
      var session = _.findWhere(this.server.sessions, { id: options.sessionId });
      if (session) {
        session.io.emit(str, data);
      } else {
        throw new Error('No Sessions!!!! This should not happen...');
      }
    } else {
      for (var i = 0; i < this.server.sessions.length; ++i) {
        this.server.sessions[i].io.emit(str, data);
      }
    }
  }
};

/**
 * Handles the 'middleman' in a 3+-way vagrant session.
 * If a vagrant instance is a 'client' and 'server', it is
 * now considered a 'proxy' and its sole purpose is to proxy
 * information through, upstream or downstream.
 *
 * If vantage is not a proxy, it resolves a promise for further
 * code that assumes one is now an end user. If it ends up 
 * piping the traffic through, it never resolves the promise.
 *
 * @param {String} str
 * @param {String} direction
 * @param {String} data
 * @param {Object} options
 * @api private
 */
vantage._proxy = function(str, direction, data, options) {
  var self = this;
  return new Promise(function(resolve, reject){
    if (self.is('proxy')) {
      self._send(str, direction, data, options);
    } else {
      resolve();
    }
  });
};

/**
 * Event handler for keypresses - deals with command history
 * and tabbed auto-completion.                                   
 *
 * @param {Event} e
 * @param {Prompt} prompt
 * @api private
 */

vantage._keypressHandler = function(e, prompt) {
  this._activePrompt = prompt;
  var key = (e.key || {}).name;
  var keyMatch = (['up', 'down', 'tab'].indexOf(key) > -1);
  var value = (prompt) ? String(prompt.rl.line).trim() : void 0;

  if (this.is('local')) {
    if (keyMatch) {
      var result = this._getKeypressResult(key, value);
      if (result !== undefined) { 
        this._redraw(prompt, result)
      }
    } else {
      this._histCtr = 0;
    }
  } else {
    this._send('vantage-keypress-upstream', 'upstream', { key: key, value: value });
  }
};

/**
 * Helper for vantage._keypressHandler.
 *
 * @param {String} key
 * @param {String} value
 * @return {Function}
 * @api private
 */

vantage._getKeypressResult = function(key, value) {
  if (['up', 'down'].indexOf(key) > -1) {
    return this._getHistory(key);
  } else if (key == 'tab') {
    return str = this._getAutocomplete(value);
  }
};

/**
 * Starts vantage listening as a server.
 *
 * @param {Mixed} app
 * @param {Object} options
 * @return {Vantage}
 * @api public
 */

vantage.listen = function(app, options) {
  this.server.init(app, options);
  return this;
};

/**
 * Kills a remote vantage session. If user 
 * is running on a direct terminal, will kill
 * node instance after confirmation.
 *
 * @param {Object} options
 * @param {Function} cb
 * @api private
 */
  
vantage.exit = function(options, cb) {
  var self = this;
  if (this.is('local') && !this.is('terminable')) {
    if (options.force) {
      process.exit(1);
    } else {
      this.prompt({
        type: "confirm",
        name: "continue",
        default: false,
        message: "This will actually kill this node process. Continue?",
      }, function(result){
        if (result.continue) {
          process.exit(1);
        } else {
          self._prompt();
        }
      });
    }
  } else {
    // to do - don't handle multiple sessions on exit - i'm 
    // just kicking everyone out.
    for (var i = 0; i < self.server.sessions.length; ++i) {
      var ssn = self.server.sessions[i];
      ssn.io.emit('vantage-close-downstream');
    }
  }
};

/**
 * Gets things started if run from command line.
 */

init();