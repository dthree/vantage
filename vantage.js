/**
 * Module dependencies.
 */

var _ = require('lodash')
  , EventEmitter = require('events').EventEmitter
  , Command = require('./lib/command')
  , VantageServer = require('./lib/server')
  , VantageClient = require('./lib/client')
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
    return self.keypressHandler(e, this);
  };
  self.events = new EventEmitter();
  self.use(commons);
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
 * Commands issued to Vantage server
 * are executed in sequence. Called once
 * when a command is inserted or completes
 * and shifts the next command into 
 * vantage._command.
 *
 * @api private
 */

vantage._queueHandler = function() {
  if (this._queue.length > 0 && this._command === undefined) {
    var item = this._queue.shift();
    this._execQueueItem(item);
  }
};

// Simple getter / setter for Vantage's role
// as a client or server.

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

vantage.getHistory = function(direction) {
  if (direction == 'up') {
    this._histCtr++;
    this._histCtr = (this._histCtr > this._hist.length) ? this._hist.length : this._histCtr;
  } else if (direction == 'down') {
    this._histCtr--;
    this._histCtr = (this._histCtr < 1) ? 1 : this._histCtr;
  }

  return this._hist[this._hist.length-(this._histCtr)];
};

vantage.getAutocomplete = function(str) {
  var names = _.pluck(this.commands, "_name");
  var auto = this._autocomplete(str, names);
  return auto;
};

vantage.redraw = function(prompt, str, options) {
    prompt.rl.line = str;
    prompt.rl.cursor = str.length;
    prompt.cacheCursorPos();
    prompt.clean().render().write( prompt.rl.line );
    prompt.restoreCursorPos();
};

vantage.start = function(options) {
  var slf = exports;
  options = options || {}

  _.defaults(options, {
    pad: true,
  })

  if (options.pad === true) {
    for (var i = 0; i < 100; ++i) {
      this.log('');
    }
  }

  this._prompt();
};

// This function only gets called all the way 
// downstream.
vantage.log = function(log, options) {
  options = options || {}
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
};

vantage.pipe = function(fn){
  this._pipeFn = fn;
  return this;
};

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

vantage.hide = function() {
  this._isSilent = true;
  return this;
};

vantage.show = function() {
  this._isSilent = false;
  console.log*('HI PROMPT')
  this._prompt();
  return this;
};

vantage.version = function(str) {
  this._version = str;
  return this;
};

vantage.delimiter = function(str) {
  var slf = this;
  this._delimiter = String(str).trim() + ' ';
  this._origdelimiter = String(str).trim() + ' ';
  inquirer.prompt.prompts.input.prototype.prefix = function() {
    return slf._delimiter;
  }
  return this;
};

vantage._tempDelimiter = function(str) {
  var self = this;
  this._delimiter = String(str || '').trim() + ' ';
  inquirer.prompt.prompts.input.prototype.prefix = function() {
    return self._delimiter;
  }
};

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

    self.send('vantage-prompt-downstream', 'downstream', { options: options, value: void 0 });
  }
};

vantage._prompt = function() {
  var self = this;

  // If we somehow got to _prompt and aren't the 
  // local client, send the command downstream.
  if (this.is('server')) {
    this.send('vantage-resume-downstream', 'downstream'); 
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
};

vantage.exec = function(str, cb) {
  var self = this;
  var command = {
    command: str,
    callback: cb,
  }
  if (cb !== undefined) {
    self._queue.push(command);
    self._queueHandler.call(self);
  } else {
    return new Promise(function(resolve, reject) {
      
      //console.log(util.inspect(reject, {showHidden: true, depth: null}));

      command.resolve = resolve;
      command.reject = reject;

      //if (command.command.indexOf('fail me yes') > -1) {
        //console.log('--------------A1-----------------');
        //console.log(util.inspect(command, {showHidden: true, depth: null}));
      //}

      self._queue.push(command);
      self._queueHandler.call(self);
    });
  }
};

vantage._execQueueItem = function(item) {
  var self = this;
  if (self.is('local')) {
    this._exec(item);
  } else {
    //console.log('Reassigning self._command to '.red + item.command);
    self._command = item;
    //if (self._command.command.indexOf('fail me yes') > -1) {
      //console.log('--------------A2.5-----------------');
      //console.log(util.inspect(self._command, {showHidden: true, depth: null}));
    //}
    self.send('vantage-command-upstream', 'upstream', { command: item.command, completed: false });
  };
};

vantage._parseArgs = function(value, env, file) {
  var reg = /[^\s'"]+|['"]([^'"]*)['"]/gi, str = value, arr = [], match;
  if (env) { arr.push(env); }
  if (file) { arr.push(file); }
  do {
    match = reg.exec(str);
    if (match !== null) {
      arr.push(match[1] ? match[1] : match[0]);
    }
  } while (match !== null);
  return arr;
};

vantage._exec = function(item) {
  
  item = item  || {}
  // if (item.command.indexOf('fail me yes') > -1) {
    //console.log('--------------A3-----------------');
    //console.log(util.inspect(item, {showHidden: true, depth: null}));
  //}
  //item.callback = item.callback || function() {}
  item.command = item.command || '';
  //item.resolve = item.resolve || function(){}
  //item.reject = item.reject || function(){}

  var self = this;
  var parts = item.command.split(' ');
  var path = [];
  var match = false;
  var args;

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

  var parsedArgs = minimist(self._parseArgs(args));
  parsedArgs['_'] = parsedArgs['_'] || [];
  var args = {}

  //if (parsedArgs.cheese) {
    //console.log(parsedArgs)
  //}

  //console.log(parsedArgs)

  if (match) {

    var fn = match._fn;
    var origArgs = match._args;
    var origOptions = match.options;
    args.options = {}

    if (parsedArgs.help || parsedArgs.h || parsedArgs['_'].indexOf('/?') > -1) {
      self.log(match.helpInformation());
      item.callback(); return;
    } 

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

    for (var i = 0; i < origOptions.length; ++i) {
      var o = origOptions[i];
      var short = String(o.short || '').replace(/-/g, '');
      var long = String(o.long || '').replace(/--no-/g, '').replace(/-/g, '');
      //var negate = String(o.long || '').replace(/--no-/g, '');
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

    var res = fn.call(this, args, item.callback);
    if (res && _.isFunction(res.then)) {
      //console.log(item)

      return res.then(function(data){
        if (item.callback !== undefined) { 
          item.callback(data); 
        } else if (item.resolve !== undefined) { 
          return item.resolve(data); 
        }
      }).catch(function(err){
        self.log(['', '  Error: '.red + err, '']);
        
        //console.log('WOW WOW CAUGHT ERROR'.magenta)
        //console.log(item.reject)
        //console.log(util.inspect(item.reject, {showHidden: true, depth: null}));
        if (item.callback !== undefined) {
          item.callback(err);
        } else if (item.reject !== undefined) {
          item.reject(err);
        }
        //if (item.reject !== undefined) { console.log('returning reject!!'); return item.reject(err); }
        //if (item.callback !== undefined) { console.log('returning callback'); item.callback(err); }
      });
      //return res.then(item.callback).catch(function(err) { 
        //self.log(['', '  Error: '.red + err, '']);
        //item.callback(err);
        //return;
      //});
    }
  } else {
    self.log(this.commandHelp(item.command));
    item.callback();
  }
};

vantage.commandHelp = function(command) {
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
      return self._humanReadableArgName(arg);
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
    return '    ' + self.pad(cmd + ' *', width) + '  ' + counts[cmd] + ' sub-command' + ((counts[cmd] == 1) ? '' : 's') + '.';
  });

  var str = [
      invalidString + '\n  Commands:'
    , ''
    , commands.map(function(cmd) {
      return self.pad(cmd[0], width) + '  ' + cmd[1];
    }).join('\n').replace(/^/gm, '    ')
    , (groups.length < 1 
      ? ''
      : '\n  Command Groups:\n\n' + groups.join('\n') + '\n')
  ].join('\n');

  return str;
};

vantage._humanReadableArgName = function(arg) {
    var nameOutput = arg.name + (arg.variadic === true ? '...' : '');

    return arg.required
      ? '<' + nameOutput + '>'
      : '[' + nameOutput + ']'
};

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

        //var strXX = strX + 

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

vantage.pad = function(str, width, delimiter) {
    delimiter = delimiter || ' ';
    var len = Math.max(0, width - str.length);
    return str + Array(len + 1).join(' ');
};

vantage._listen = function() {

};

// Abstracts the logic for sending and receiving
// sockets upstream and downstream.
vantage.send = function(str, direction, data, options) {
  
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

// Handles the 'middleman' in a 3+-way vagrant session.
// If a vagrant instance is a 'client' and 'server', it is
// now considered a 'proxy' and its sole purpose is to pipe
// information through, upstream or downstream.
//
// If vantage is not a proxy, it resolves a promise for further
// code that assumes one is now an end user. If it ends up 
// piping the traffic through, it never resolves the promise.
vantage._pipe = function(str, direction, data, options) {
  var self = this;
  return new Promise(function(resolve, reject){
    if (self.is('proxy')) {
      self.send(str, direction, data, options);
    } else {
      resolve();
    }
  });
};

vantage.keypressHandler = function(e, prompt) {
  this._activePrompt = prompt;
  var key = (e.key || {}).name;
  var keyMatch = (['up', 'down', 'tab'].indexOf(key) > -1);
  var value = (prompt) ? String(prompt.rl.line).trim() : void 0;

  if (this.is('local')) {
    if (keyMatch) {
      var result = this._getKeypressResult(key, value);
      if (result !== undefined) { 
        this.redraw(prompt, result)
      }
    } else {
      this._histCtr = 0;
    }
  } else {
    this.send('vantage-keypress-upstream', 'upstream', { key: key, value: value });
  }
};

vantage._getKeypressResult = function(key, value) {
  if (['up', 'down'].indexOf(key) > -1) {
    return this.getHistory(key);
  } else if (key == 'tab') {
    return str = this.getAutocomplete(value);
  }
};

  // Generates a random id.
vantage._guid = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};

vantage.listen = function(app, options) {
  this.server.init(app, options);
  return this;
};
  
vantage.exit = function(option, cb) {
  var self = this;
  if (this.is('local') && !this.is('terminable')) {
    if (option.force) {
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

init();

