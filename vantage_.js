
var _ = require('lodash')
  , EventEmitter = require('events').EventEmitter
  , Command = require('./lib/command')
  , Session = require('./lib/session')
  , commons = require('./lib/vantage-commons')
  , commander = require('commander')
  , inquirer = require('inquirer')
  , minimist = require('minimist')
  , intercept = require('intercept-stdout')
  , argparse = require('string-argv')
  , path = require('path')
  , util = require('util')
  , fs = require('fs')
  , vantage
  ;

exports = module.exports = vantage = new (function(name, slave) {

  // Registred `vantage.command` commands and 
  // their options.
  this.commands = [];
  this.options = [];

  // Sessions are created when you use 
  // vantage externally to remotely connect
  // to this running instance of vantage.
  // Every connection (a socket.io connection)
  // is stored as a Session object.
  this.sessions = [];

  // Program version
  // Exposed through vantage.version(str);
  this._version = '';

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

  // Fail-safe to ensure there is no double 
  // prompt in odd situations.
  this._midPrompt = false;

})()

_.extend(exports, {

  init: function() {

    inquirer.prompt.prompts.input.prototype.onKeypress = function(e) {
      return vantage.keypressHandler(e, this);
    };

    vantage.events = new EventEmitter();

    vantage
      .parseArgv()
      .use(commons);

  },

  parseArgv: function() {

    var cmdValue, envValue;

    var script = String(process.argv[1]).split('/');
    script = script[script.length-1].split('\\');
    script = script[script.length-1];

    var options = {}

    if (script == 'vantage.js') {

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
        console.error('\n  Please specify a server and a port.');
        console.log('\n  Example: vantage 192.168.0.1:3000.\n')
        process.exit(1);
      } else {

        if (envValue.ssl === true) {
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
          console.error('\n  Invalid server/port passed: ' + server + ':' + port + '\n');
          process.exit(1);
        }

        //vantage.is('terminable', true);

        vantage.client.connect(server, port, options);
      }

    } else {

      // Defaults as interminable if file run is 
      // not vantage.js.

      vantage.is('terminable', false);
    }

    return vantage;
  },

  _debug: function(log) {

    console.log(this._port + '|' + log);
  },

  // Simple getter / setter for Vantage's role
  // as a client or server.
  is: function(role, setter) {


    vantage._isClient = (role == 'client' && setter !== undefined) ? setter : vantage._isClient;
    vantage._isServer = (role == 'server' && setter !== undefined) ? setter : vantage._isServer;
    vantage._isTerminable = (role == 'terminable' && setter !== undefined) ? setter : vantage._isTerminable;

    //console.log('is..', vantage._isClient + '|' + vantage._isServer + '|' + role)

    var response = 
     (role == 'terminable' && vantage._isTerminable) ? true : 
     (role == 'local' && (!vantage._isServer && !vantage._isClient)) ? true : 
     (role == 'local' && (vantage._isClient && vantage._isTerminable)) ? true : 
     (role == 'local') ? false : 
     (role == 'proxy' && vantage._isClient && vantage._isServer) ? true : 
     (role == 'proxy') ? false : 
     (role == 'client') ? vantage._isClient : 
     (role == 'server') ? vantage._isServer : false;

    //console.log('is ', role, response, vantage._port);

    return response;
  },

  use: function(commands) {
    commands = _.isArray(commands) ? commands : [commands];
    for (var i = 0; i < commands.length; ++i) {
      var cmd = commands[i];
      if (cmd.command) {
        var command = vantage.command(cmd.command);

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
    return vantage;
  },

  getHistory: function(direction) {

    if (direction == 'up') {

      vantage._histCtr++;
      vantage._histCtr = (vantage._histCtr > vantage._hist.length) ? vantage._hist.length : vantage._histCtr;
      return vantage._hist[vantage._hist.length-(vantage._histCtr)];
    
    } else if (direction == 'down') {
    
      vantage._histCtr--;
      vantage._histCtr = (vantage._histCtr < 1) ? 1 : vantage._histCtr;
      return vantage._hist[vantage._hist.length-(vantage._histCtr)];
    }

  },

  getAutocomplete: function(str) {

    var names = _.pluck(vantage.commands, "_name");
    var auto = vantage._autocomplete(str, names);
    return auto;
  
  },

  redraw: function(prompt, str, options) {
    prompt.rl.line = str;
    prompt.rl.cursor = str.length;
    prompt.cacheCursorPos();
    prompt.clean().render().write( prompt.rl.line );
    prompt.restoreCursorPos();
  },

  start: function(options) {

    var slf = exports;

    options = options || {}

    _.defaults(options, {
      pad: true,
    })

    if (options.pad === true) {
      for (var i = 0; i < 100; ++i) {
        vantage.log('');
      }
    }

    vantage._prompt();
  },

  log: function(log, options) {
    options = options || {}
    log = (_.isArray(log)) ? log : [log];
    for (var i = 0; i < log.length; ++i) {
      console.log(log[i]);
    }
  },

  command: function(name, desc, opts) {

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
  
  },

  version: function(str) {
    this._version = str;
  },

  delimiter: function(str) {
    var slf = this;
    this._delimiter = String(str).trim() + ' ';
    this._origdelimiter = String(str).trim() + ' ';
    inquirer.prompt.prompts.input.prototype.prefix = function() {
      return slf._delimiter;
    }
  },

  _tempDelimiter: function(str) {
    var slf = vantage;
    vantage._delimiter = String(str || '').trim() + ' ';
    inquirer.prompt.prompts.input.prototype.prefix = function() {
      return slf._delimiter;
    }
  },

  prompt: function(options, cb) {

    var slf = this;

    options = options || {}

    if (vantage.is('local')) {

      vantage._tempDelimiter((options.message) ? options.message : vantage._delimiter);

      // next: set vantage._tempDelimiter() on all delimiter assignments....

      inquirer.prompt(options, function(result) {
        vantage._tempDelimiter(vantage._origdelimiter);
        cb(result);
      });

    } else {

      vantage.events.on('vantage-prompt-upstream', function(data){

        var response = data.value;

        cb(response);
      });

      vantage.send('vantage-prompt-downstream', 'downstream', { options: options, value: void 0 });

    }
  },

  _prompt: function() {

    var slf = this;

    //vantage._debug('Prompt|' + 'Local: ' + vantage.is('local') + '|' + 'Client: ' + vantage.is('client') + '|' + 'Server: ' + vantage.is('server') + '|');

    // If we somehow got to _prompt and aren't the 
    // local client, send the command downstream.
    if (vantage.is('server')) {
      //vantage._debug('so im not local...');
      vantage.send('vantage-resume-downstream', 'downstream'); 
      return;
    }

    // If we double up on a prompt, chill out.
    if (vantage._midPrompt) { return; }

    vantage._midPrompt = true;

    inquirer.prompt({
      type: "input",
      name: "command",
      message: vantage._delimiter,
    }, function(result){

      vantage._midPrompt = false;

      var str = String(result.command).trim();

      if (str == '') { vantage._prompt(); return; }

      if (vantage.is('local')) {

        slf._exec(str, function() {
          slf._prompt();
        });

      } else {

        // new!!!
        vantage.send('vantage-command-upstream', 'upstream', { command: str, completed: false });
      }

    });
  },

  _exec: function(str, cb, options) {

    cb = cb || function(){}
    options = options || function() {}

    var slf = this;
    var parts = str.split(' ');

    var path = [];
    var match = false;
    var args;

    vantage._hist.push(str);

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

    var parsedArgs = minimist(argparse.parseArgsStringToArgv(args));
    parsedArgs['_'] = parsedArgs['_'] || [];

    var args = {}
    
    if (match) {

      var fn = match._fn;

      var origArgs = match._args;
      var origOptions = match.options;
      args.options = {}

      if (parsedArgs.help || parsedArgs.h || parsedArgs['_'].indexOf('/?') > -1) {
        match.log(match.helpInformation());
        cb(); return;
      } 

      for (var i = 0; i < origArgs.length; ++i) {
        var exists = parsedArgs._[i];
        if (!exists && origArgs[i].required === true) {
          match.log(" ");
          match.log("  Missing required argument. Showing Help:");
          match.log(match.helpInformation());
          cb(); return;
        }
        if (exists) {
          args[origArgs[i].name] = exists;
        }
      }

      for (var i = 0; i < origOptions.length; ++i) {
        var o = origOptions[i];
        var short = String(o.short).replace(/-/g, '');
        var long = String(o.long).replace(/-/g, '');
        var flag = String(o.flags).slice(Math.abs(o.required), o.flags.length).replace('>', '').trim();
        var exists = parsedArgs[short] || parsedArgs[long];
        if (!exists && o.required !== 0) {
          match.log(" ");
          match.log("  Missing required option. Showing Help:");
          match.log(match.helpInformation());
          cb();
          return;
        }
        if (exists) {
          args.options[long || short] = exists;
        }
      }

      var res = fn.call(vantage, args, cb);

      if (res && _.isFunction(res.then)) {
        res.then(cb).catch(function(err) { 
          slf.log(['', '  Error: '.red + err, '']);
          cb();
        });
      }

    } else {

      slf.log(vantage.commandHelp(str));
      cb();
    }
  },

  commandHelp: function(command) {

    if (!this.commands.length) return '';

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
      ? ['', "  Invalid command. Showing Help:", ''].join('\n')
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
        return vantage._humanReadableArgName(arg);
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
      return '    ' + vantage.pad(cmd + ' *', width) + '  ' + counts[cmd] + ' sub-command' + ((counts[cmd] == 1) ? '' : 's') + '.';
    });

    var str = [
        invalidString + '\n  Commands:'
      , ''
      , commands.map(function(cmd) {
        return vantage.pad(cmd[0], width) + '  ' + cmd[1];
      }).join('\n').replace(/^/gm, '    ')
      , (groups.length < 1 
        ? ''
        : '\n  Command Groups:\n\n' + groups.join('\n') + '\n')
    ].join('\n');

    //console.log(util.inspect(str));
    return str;
  },

  _humanReadableArgName: function(arg) {
    var nameOutput = arg.name + (arg.variadic === true ? '...' : '');

    return arg.required
      ? '<' + nameOutput + '>'
      : '[' + nameOutput + ']'
  },

  _autocomplete: function(str, arr) {

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
  },

  pad: function(str, width, delimiter) {
    delimiter = delimiter || ' ';
    var len = Math.max(0, width - str.length);
    return str + Array(len + 1).join(' ');
  },

  _listen: function() {

  },

  // Abstracts the logic for sending and receiving
  // sockets upstream and downstream.
  send: function(str, direction, data, options) {

    options = options || {}

    if (direction == 'upstream') {

      //console.log(console.trace());
      vantage.client.io.emit(str, data);

    } else if (direction == 'downstream') {

      if (options.sessionId) {

        var session = _.findWhere(vantage.server.sessions, { id: options.sessionId });

        if (session) {

          session.io.emit(str, data);
        }

      } else {

        for (var i = 0; i < vantage.server.sessions.length; ++i) {

          vantage.server.sessions[i].io.emit(str, data);
        }
      }
    }
  },

  // Handles the 'middleman' in a 3+-way vagrant session.
  // If a vagrant instance is a 'client' and 'server', it is
  // now considered a 'proxy' and its sole purpose is to pipe
  // information through, upstream or downstream.
  //
  // If vantage is not a proxy, it resolves a promise for further
  // code that assumes one is now an end user. If it ends up 
  // piping the traffic through, it never resolves the promise.
  pipe: function(str, direction, data, options) {

    return new Promise(function(resolve, reject){

      if (vantage.is('proxy')) {

        vantage.send(str, direction, data, options);

      } else {

        resolve();
      }

    });

  },

  keypressHandler: function(e, prompt) {

    vantage._activePrompt = prompt;

    var key = (e.key || {}).name;

    var keyMatch = (['up', 'down', 'tab'].indexOf(key) > -1);

    var value = (prompt) ? String(prompt.rl.line).trim() : void 0;

    if (vantage.is('local')) {

      if (keyMatch) {

        var result = vantage._getKeypressResult(key, value);
        if (result !== undefined) { 
          vantage.redraw(prompt, result)
        }

      } else {

        vantage._histCtr = 0;

      }

    } else {

      vantage.send('vantage-keypress-upstream', 'upstream', { key: key, value: value });

    }

  },

  _getKeypressResult: function(key, value) {

    if (['up', 'down'].indexOf(key) > -1) {

      return vantage.getHistory(key);

    } else if (key == 'tab') {

      return str = vantage.getAutocomplete(value);

    }

  },

  // Generates a random id.
  _guid: function() {

    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  },

  listen: function(app, options) {

    vantage.server.init(app, options);
    return this;
  },
  
  exit: function(option) {

    if (vantage.is('local') && !vantage.is('terminable')) {

      if (option.force) {

        process.exit(1);

      } else {

        vantage.prompt({
          type: "confirm",
          name: "continue",
          default: false,
          message: "This will actually kill this node process. Continue?",
        }, function(result){

          if (result.continue) {

            process.exit(1);

          } else {

            vantage._prompt();
          }

        });

      }

    } else {

      // to do - don't handle multiple sessions on exit - i'm 
      // just kicking everyone out.
      for (var i = 0; i < vantage.server.sessions.length; ++i) {
        var ssn = vantage.server.sessions[i];
        ssn.io.emit('vantage-close-downstream');
      }

    }

  },

});

vantage.server = new (function(){

  this._hooked = false;
  this.sessions = [];
  return this;
})();

_.extend(vantage.server, {

  init: function(app, options) {

    options = options || {}

    var appIs = 
      (_.isFunction(app)) ? 'callback' :
      (_.isObject(app) && _.isFunction(app.callback)) ? 'koa' :
      '';

    //console.log('HTTP Server is: ', appIs);

    options = _.defaults(options, {
      port: 80,
      ssl: false,
    });

    //console.log(app)

    var appCallback = 
      (appIs == 'callback') ? app : 
      (appIs == 'koa') ? app.callback() : 
      void 0;

    if (!appCallback) {
      throw new Error('Unsupported HTTP Server passed into Vantage.'); return;
    }

    //console.log(cb())

    var type = (options.ssl) ? 'https' : 'http';

    if (type == 'http') {
      this.server = require(type).createServer(appCallback);
    } else {

      console.log('Creating SSL server:')

      this.server = require(type).createServer(options, appCallback);
    }

    this.io = require('socket.io')(this.server);
    this.server.listen(options.port);

    vantage._port = options.port;

    this.listen();

  },

  listen: function() {

    var self = vantage.server;

    this.io.on('connection', function(socket) {


      var session = new Session();

      session.io = socket;

      self.sessions.push(session);

      vantage.is('server', true);

      session.io.on('vantage-keypress-upstream', function(data) {

        vantage.pipe('vantage-keypress-upstream', 'upstream', data).then(function(){

          if ((['up', 'down', 'tab'].indexOf(data.key) > -1)) {

            var response = vantage._getKeypressResult(data.key, data.value);
            vantage.send('vantage-keypress-downstream', 'downstream', { value: response });

          } else {

            vantage._histCtr = 0;
          }
        });
      });

      session.io.on('vantage-command-upstream', function(data) {

        vantage.pipe('vantage-command-upstream', 'upstream', data).then(function() {

          if (data.command) {

            vantage._exec(data.command, function() {

              vantage.send('vantage-command-downstream', 'downstream', { command: data.command, completed: true });
            });
          }
        });
      }); 

      session.io.on('vantage-heartbeat-upstream', function(data) {

        vantage.pipe('vantage-heartbeat-upstream', 'upstream', data).then(function() {

          vantage.send('vantage-heartbeat-downstream', 'downstream', {
            delimiter: vantage._delimiter,
          });
        });
      }); 

      // Upstream > Proxy > Downstream (Prompt User) > @Proxy > @Upstream (Use Data).
      session.io.on('vantage-prompt-upstream', function(data) {

        vantage.pipe('vantage-prompt-upstream', 'upstream', data).then(function() {

          vantage.events.emit('vantage-prompt-upstream', data);
        });
      }); 

      session.io.on('disconnect', function() {

        var nw = [];

        for (var i = 0; i < vantage.server.sessions.length; ++i) {
          if (vantage.server.sessions[i].io.id == session.io.id) {
            delete vantage.server.sessions[i];
          } else {
            nw.push(vantage.server.sessions[i]);
          }
        }

        vantage.server.sessions = nw;

        vantage.server.unhook();
        console.log('User exited session.');

        if (vantage.server.sessions.length < 1) {
          vantage.is('server', false);
        }

        //vantage.server.listen();

      });

      // ------------------------------------------

      console.log('\nUser entering session.')

      vantage.server.hook(function(txt) {
        vantage.send('vantage-stdout-downstream', 'downstream', { value: txt });
        return txt = '';
      });

      session.io.emit('vantage-heartbeat-downstream', {
        delimiter: vantage._delimiter,
      });

    }); 

    return this;
  },

  unhook: function() {

    if (this._hooked && this._unhook !== undefined && vantage.server.sessions.length < 1) {

      this._unhook();
      this._hooked = false;

      console.log('Stdout returned to console.');
    }

    return this;

  },

  hook: function(fn) {

    if (this._hooked && this._unhook != undefined) {
      this.unhook();
    }

    console.log('Piping stdout downstream.');

    this._unhook = intercept(fn);
    this._hooked = true;

    return this;

  },

});

vantage.client = new (function(){
  return this;
})();

_.extend(vantage.client, {

  connect: function(server, port, options, cb) {

    var self = vantage.client;

    cb = cb || function() {}


    options = _.defaults(options, {
      ssl: false,
    });

    var method = (options.ssl) ? 'https' : 'http';

    console.log('Connecting to ' + server + ':' + port + ' using ' + method + '...');

    self.io = require('socket.io-client')(method + '://' + server + ':' + port, {
      'force new connection': true,
      'secure': true,
      //'connect timeout': 2000,
    });

    self.io.on('connect', function(a) {

      //vantage.delimiter('>');

      vantage.is('client', true);

      vantage.client.io.on('vantage-keypress-downstream', function(data) {

        vantage.pipe('vantage-keypress-downstream', 'downstream', data).then(function(){

          if (data.value !== undefined) {

            vantage.redraw(vantage._activePrompt, data.value);
          }
        });
      });

      vantage.client.io.on('vantage-command-downstream', function(data) {

        vantage.pipe('vantage-command-downstream', 'downstream', data).then(function(){

          if (data.completed === true) {

            vantage._prompt();
          }
        });
      });

      vantage.client.io.on('vantage-stdout-downstream', function(data) {

        vantage.pipe('vantage-stdout-downstream', 'downstream', data).then(function(){

          var stdout = data.value || '';

          stdout = 
            (util.inspect(stdout.slice(stdout.length-2, stdout.length).trim() == '\n'))
            ? stdout.slice(0, stdout.length-1) 
            : stdout;

          console.log(stdout);
        });
      });

      vantage.client.io.on('vantage-heartbeat-downstream', function(data){

        //console.log(vantage._isClient + '|' + vantage._isServer);
        //vantage._debug('Downstream...')

        vantage.pipe('vantage-heartbeat-downstream', 'downstream', data).then(function(){

          //vantage._debug('Downstream... Piped')

          if (data.delimiter) {
            //vantage._debug('trying to delimiter...' + data.delimiter);
            vantage._tempDelimiter(data.delimiter);
            //vantage._debug('did delimiter...');
          }


          //vantage._debug('Downstream... Emitting heartbeat.')

          vantage.events.emit('vantage-heartbeat-downstream');
          // ... we should do more things, eh?

        });
      });

      vantage.client.io.on('vantage-prompt-downstream', function(data){

        vantage.pipe('vantage-prompt-downstream', 'downstream', data).then(function(){

          // Set local prompt delimiter to question 
          // from upstream prompt command.
          vantage._tempDelimiter(data.options.message);

          inquirer.prompt(data.options, function(result){

            // Reset local prompt delimiter.
            vantage._tempDelimiter(vantage._origdelimiter);

            // Pipe prompt response back upstream so command
            // execution can continue.
            vantage.send('vantage-prompt-upstream', 'upstream', { value: result });
          });
        });
      });

      vantage.client.io.on('vantage-close-downstream', function(data){

        vantage.client.io.close();

        //if ()

        //vantage._prompt();
      });

      vantage.client.io.on('vantage-resume-downstream', function(data) {

        vantage.pipe('vantage-resume-downstream', 'downstream', data).then(function(){

          vantage._prompt();

        });
      });

      var start = function() {
        //vantage.events.removeListener('vantage-heartbeat-downstream', start);
        //console.log('  Connected Successfully.\n');
        //console.log('Got heartbeat downstream... Starting prompt.');
        vantage._prompt();
      }

      vantage.events.on('vantage-heartbeat-downstream', start);

      //vantage.client.io.emit('vantage-heartbeat-upstream', {})

      cb();
      

    });

    self.io.on('event', function(e){
      console.log('event', e);
    });

    self.io.on('connect_timeout', function(e){
      console.log('timeout', e);
    });

    self.io.on('connect_error', function(e){
      
      var description = (e.description == 503) ? '503 Service Unavailable' : e.description;
      
      console.log('Error connecting: '.yellow + description);

      if (vantage.is('terminable')) {
        process.exit(1);
      } else {

        self.io.close();
        //vantage._debug('Prompt...!!')
        vantage._prompt();
      }
    });

    self.io.on('error', function(e){
      console.log('error', e);
    });

    self.io.on('disconnect', function(data){

      vantage.is('client', false);

      if (vantage.is('server')) {

        vantage._tempDelimiter(vantage._origdelimiter);

        vantage.send('vantage-heartbeat-downstream', 'downstream', {
          delimiter: vantage._delimiter,
        });
      
      } else {

        // .. the process should end at this point...

        if (vantage.is('local')) {

          vantage._tempDelimiter(vantage._origdelimiter);

          vantage._prompt();
        }

      }

      delete self.io;

    });

  },

});


vantage.init();







