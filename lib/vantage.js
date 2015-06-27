
/**
 * Module dependencies.
 */

var _ = require("lodash")
  , EventEmitter = require("events").EventEmitter
  , Command = require("./command")
  , VantageServer = require("./server")
  , VantageClient = require("./client")
  , VantageUtil = require("./util")
  , intercept = require("./intercept")
  , commons = require("./vantage-commons")
  , inquirer = require("inquirer")
  , minimist = require("minimist")
  , npm = require("npm")
  , temp = require("temp")
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
 * Extend Vantage prototype as an event emitter.
 */

Vantage.prototype.__proto__ = EventEmitter.prototype;

/**
 * Initialize a new `Vantage` instance.
 *
 * @return {Vantage}
 * @api public
 */

function Vantage() {

  if (!(this instanceof Vantage)) return new Vantage;

  // Program version
  // Exposed through vantage.version(str);
  this._version = "";

  // Registered `vantage.command` commands and 
  // their options.
  this.commands = [];

  // Prompt delimiter.
  // Exposed through vantage.delimiter(str).
  this._delimiter = "local~$";
  this._origdelimiter = "local~$";
  this._delimiterCache = "local~$";

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

  // Hook to reference active inquirer prompt.
  this._activePrompt;

  // Determines whether or not to show a prompt on the
  // local Vantage server terminal. Exposed through
  // Vantage.show();
  this._isSilent = true;

  // Banner to display on login to a system. If null,
  // doesn't display a banner.
  this._banner = void 0;

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

  // Whether a prompt is currently in cancel mode.
  this._cancelled = false;

  // Whether all stdout is being hooked through a function.
  this._hooked = false;

  // Expose common utilities, like padding.
  this.util = VantageUtil;

  // Unique ID for this instance of Vantage.
  this._id = parseFloat(Math.round(Math.random()*1000000));

  // Special command mode vantage is in at the moment,
  // such as REPL. See mode documentation.
  this._mode = void 0;

  this._init();
  return this;
}

/**
 * Extension to `constructor`.
 * @api private
 */

Vantage.prototype._init = function() {
  var self = this;

  // Hook in to steal inquirer's keypress.
  inquirer.prompt.prompts.input.prototype.onKeypress = function(e) {
    self.emit('client_keypress', e);
    return self._keypressHandler(e, this);  
  };

  // Extend the render function to steal the active prompt object,
  // as inquirer doesn't expose it and we need it.
  (function(render){
    inquirer.prompt.prompts.input.prototype.render = function() {
      self._activePrompt = this;
      return render.call(this)
    }
  })(inquirer.prompt.prompts.input.prototype.render)

  self.use(commons);
}

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
  this._delimiter = String(str).trim() + " ";
  this._origdelimiter = String(str).trim() + " ";
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
  if (this.is("local") || this.is('client') && !this.is('server')) {
    this._delimiter = String(str || "").trim() + " ";
    inquirer.prompt.prompts.input.prototype.prefix = function() {
      return self._delimiter;
    }
    if (this._midPrompt) {
      this._refresh();
    }
  } else {
    this._send("vantage-delimiter-downstream", "downstream", { value: str });
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
  this._isClient = (role == "client" && setter !== undefined) ? setter : this._isClient;
  this._isServer = (role == "server" && setter !== undefined) ? setter : this._isServer;
  this._isTerminable = (role == "terminable" && setter !== undefined) ? setter : this._isTerminable;

  var response = 
   (role == "terminable" && this._isTerminable) ? true : 
   (role == "local" && (!this._isServer && !this._isClient)) ? true : 
   (role == "local" && (this._isClient && this._isTerminable)) ? true : 
   (role == "local") ? false : 
   (role == "proxy" && this._isClient && this._isServer) ? true : 
   (role == "proxy") ? false : 
   (role == "client") ? this._isClient : 
   (role == "server") ? this._isServer : false;

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
  this._isSilent = false;
  return this.client.connect.call(this.client, server, port, options, cb);
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

vantage.use = function(commands, options) {
  if (!commands) { return this; }
  if (_.isFunction(commands)) {
    commands.call(this, this, options);
  } else if (_.isString(commands)) {
    return this.use(require(commands), options);
  } else {
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
  }
  return this;
};

/**
 * Requires a vantage module / middleware and
 * and `.use`s it. If the module doesn't exist
 * locally, it will NPM install it into a temp
 * directory and then use it.
 *
 * @param {String} key
 * @param {String} value
 * @return {Function}
 * @api private
 */

vantage._use = function(options, callback) {

  var self = this
    , config
    , registeredCommands = 0
    ;

  options = (_.isString(options)) 
    ? { module: options } 
    : (options || {})

  options = _.defaults(options, {
    loglevel: "silent"
  });

  config = {
    loglevel: options.loglevel,
    production: true
  }

  try {
    var mod = require("underscore");
  } catch(e) {
    load(function(err, mod){
      if (err) {
        callback(true, "Error downloading module: " + mod);
      } else {
        self.on("command_registered", registryCounter);
        self.use(mod);
        self.removeListener("command_registered", registryCounter);
        var data = {
          registeredCommands: registeredCommands
        }
        callback(void 0, data);
      }
    });

  }

  function load(cbk) {
    npm.load(config, function(){
      npm.registry.log.level = config.loglevel;
      npm.commands.install(temp.dir, [options.module], function(err, data){
        if (err) {
          cbk(err, data);
        } else {
          var dir = temp.dir + '/node_modules/' + options.module;
          var mod = require(dir);
          cbk(void 0, mod);
        }
      });  
    })
  }

  function registryCounter() {
    registeredCommands++;
  }

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
  if (direction == "up") {
    this._histCtr++;
    this._histCtr = (this._histCtr > this._hist.length) ? this._hist.length : this._histCtr;
  } else if (direction == "down") {
    this._histCtr--;
    this._histCtr = (this._histCtr < 1) ? 1 : this._histCtr;
  }
  return this._hist[this._hist.length-(this._histCtr)];
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
 * Write a banner on remote login.
 *
 * @param {String} banner
 * @return {Vantage} 
 * @api public
 */

vantage.banner = function(banner) {
  this._banner = banner || void 0;
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
  var self = this;
  log = (_.isArray(log)) ? log : [log];
  for (var i = 0; i < log.length; ++i) {
    if (this._pipeFn !== undefined) {
      // If the user has declared a pipe function,
      // pass the data through the pipe, and if
      // the user returned text, log it.
      var result = this._pipeFn.call(this, log[i]);
      if (result) {
        self._log(result);
      }
    } else {
      // Otherwise, just log the data.
      self._log(log[i]);
    }
  }
  return this;
};

/**
 * Pauses prompt while logging, and then
 * resumes prompt once the data is logged.
 *
 * @param {String} log
 * @return {Vantage} 
 * @api private
 */

vantage._log = function(log) {
  var self = this;
  var data = self._pause();
  console.log(log);
  if (data !== false) {
    self._resume(data);
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
    (name.indexOf("[") > -1) ? name.split("[") : 
    (name.indexOf("<") > -1) ? name.split("<") : [name];

  if (args[1]) {
    args[1] = (String(args[1]).indexOf("]") > -1) ? "[" + args[1] : args[1];
    args[1] = (String(args[1]).indexOf(">") > -1) ? "<" + args[1] : args[1];
  }

  var cmd = new Command(String(args.shift()).trim(), exports);
  if (desc) {
    cmd.description(desc);
    this.executables = true;
  }
  cmd._noHelp = !!opts.noHelp;
  cmd._mode = opts.mode || false;
  this.commands.push(cmd);
  cmd._parseExpectedArgs(args);
  cmd.parent = this;

  this.emit("command_registered", { command: cmd, name: name });

  return cmd;
};

/**
 * Registers a new "mode" command in the vantage API.
 *
 * @param {String} name
 * @param {String} desc
 * @param {Object} opts
 * @return {Command} 
 * @api public
 */

vantage.mode = function(name, desc, opts) {
  return this.command(name, desc, _.extend((opts || {}), { mode: true }));
}

/**
 * If Vantage is the local terminal,
 * hook all stdout, through a fn.
 *
 * @return {Vantage} 
 * @api private
 */

vantage.hook = function() {
  var self = this;
  if (this.is('local')) {
    this._hook(function(str){

      return str;
    });
  }

};

/**
 * Unhooks stdout capture.
 * 
 * @return {Vantage}
 * @api public
 */

vantage._unhook = function() {
  if (this._hooked && this._unhook !== undefined) {
    this._unhook();
    this._hooked = false;
  }
  return this;
},

/**
 * Hooks all stdout through a given function.
 * 
 * @param {Function} fn
 * @return {Vantage}
 * @api public
 */

vantage._hook = function(fn) {
  if (this._hooked && this._unhook != undefined) {
    this._unhook();
  }
  this._unhook = intercept(fn);
  this._hooked = true;
  return this;
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
  if (this._banner) {
    console.log(this._banner);
  }
  this.hook();
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

    self.on("vantage-prompt-upstream", function(data){
      var response = data.value;
      cb(response);
    });

    self._send("vantage-prompt-downstream", "downstream", { options: options, value: void 0 });
  }
  return self;
};

vantage._refresh = function() {
  if (!this._activePrompt) { return }
  if (!this._midPrompt) { return false; }
  this._activePrompt.clean();
  this._midPrompt = false;
  this._cancelled = true;
  if (this._activePrompt.status != "answered") {
    this._activePrompt.status = "answered";
    this._activePrompt.done();
  }
  this._prompt();
  return this;
},

vantage._pause = function() {
  if (!this._activePrompt) { return false; }
  if (!this._midPrompt) { return false; }
  var val = this._activePrompt.rl.line;
  this._activePrompt.clean();
  this._midPrompt = false;
  this._cancelled = true;
  this._activePrompt.status = "answered";
  this._activePrompt.done();
  return val;
},

vantage._resume = function(val) {
  val = val || "";
  if (!this._activePrompt) { return }
  if (this._midPrompt) { return }
  this._prompt();
  this._activePrompt.rl.line = val;
  this._activePrompt.rl.cursor = val.length;
  this._activePrompt.cacheCursorPos();
  this._activePrompt.clean().render().write( this._activePrompt.rl.line );
  this._activePrompt.restoreCursorPos();
  return this;
},

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
  if (this.is("server")) {
    this._send("vantage-resume-downstream", "downstream"); 
    return;
  }

  // ... we just don't show prompts - for automation.
  if (self._isSilent === true) {
    console.log('Chilling because we are silent.')
    return;  
  } 

  // If we double up on a prompt, chill out.
  if (this._midPrompt) { return; }
  this._midPrompt = true;

  var ui = inquirer.prompt({
    type: "input",
    name: "command",
    message: this._delimiter,
  }, function(result){

    self._midPrompt = false;

    if (self._cancelled == true) { self._cancelled = false; return; }

    var str = String(result.command).trim();

    self.emit("client_prompt_submit", str);

    if (str == "") { self._prompt(); return; }

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
  
  var self = this
    , item = item || {}
    , parts
    , path = []
    , match = false
    , modeCommand
    , args
    ;

  item.command = item.command  || "";
  modeCommand = item.command;
  item.command = (this._mode) ? this._mode : item.command;
  parts = item.command.split(" ");

  // History for our "up" and "down" arrows.
  this._hist.push((this._mode ? modeCommand : item.command));

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

    var fn = match._fn
      , init = match._init || (function(args, cb) { cb(); })
      , delimiter = match._delimiter || String(item.command).toLowerCase() + ':'
      , origArgs = match._args
      , origOptions = match.options
      ;

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
      var short = String(o.short || "").replace(/-/g, "");
      var long = String(o.long || "").replace(/--no-/g, "").replace(/-/g, "");
      var flag = String(o.flags).slice(Math.abs(o.required), o.flags.length).replace('>', "").trim();
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

    // If this command throws us into a "mode",
    // prepare for it.
    if (match._mode === true && !self._mode) {
      // Assign vantage to be in a "mode".
      self._mode = item.command;
      // Execute the mode's `init` function
      // instead of the `action` function.
      fn = init;
      // Reassign the command history to a 
      // cache, replacing it with a blank
      // history for the mode.
      self._histCache = _.clone(self._hist);
      self._histCtrCache = parseFloat(self._histCtr);
      self._hist = [];
      self._histCtr = 0;

      // May or may not do something with SIGINT,
      // not sure yet. Would like to, but it's messes
      // up Inquirer's prompt and then throws an
      // error when I try to redraw it. 
      //process.on('SIGINT', function(){
        //self._exitMode();
      //});

      // _delimiterCache;
      self._delimiterCache = self._delimiter;
      self._tempDelimiter(self._delimiter + delimiter);
    
    } else if (self._mode) {

      if (String(modeCommand).trim() == 'exit') {
        self._exitMode();
        if (item.callback) {
          item.callback.call(self);
        } else if (item.resolve !== undefined) {
          return item.resolve();
        }
        return;
      }

      // This executes when actually in a "mode"
      // session. We now pass in the raw text of what
      // is typed into the first param of `action`
      // instead of arguments.
      args = modeCommand;
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
    
    // Call the vantage API function.
    var res = fn.call(this, args, function(a, b, c, d, e, f, g) {
      self.emit('client_command_executed', { command: item.command });
      if (item.callback) {
        item.callback.call(self, a, b, c, d, e, f, g);
      } else if (item.resolve !== undefined) {
        return item.resolve(a, b, c, d, e, f, g);
      }
    });

    // If the Vantage API function as declared by the user
    // returns a promise, then we do this.
    if (res && _.isFunction(res.then)) {
      return res.then(function(data){
        if (self.is('local')) {
          self.emit('client_command_executed', { command: item.command });
        }
        if (item.callback !== undefined) { 
          item.callback(data); 
        } else if (item.resolve !== undefined) { 
          return item.resolve(data); 
        }
      }).catch(function(err) {
        self.log(["", '  Error: '.red + err, '']);
        if (self.is('local')) {
          self.emit('client_command_error', { command: item.command, error: err });
        }
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
 * Exits out of a give "mode" one is in.
 * Reverts history and delimiter back to
 * regular vantage usage.
 *
 * @api private
 */

vantage._exitMode = function() {

  this._mode = false;
  this._hist = this._histCache;
  this._histCtr = this._histCtrCache;
  this._histCache = [];
  this._histCtrCache = 0;
  this._tempDelimiter(this._delimiterCache);
  this._delimiterCache = void 0;
};

/**
 * Returns help string for a given command.
 *
 * @param {String} command
 * @api private
 */

vantage._commandHelp = function(command) {
  if (!this.commands.length) return "";

  var self = this;
  var matches = [];
  var singleMatches = [];

  command = (command) ? String(command).trim().toLowerCase() : void 0;
  for (var i = 0; i < this.commands.length; ++i) {
    var parts = String(this.commands[i]._name).split(' ');
    if (parts.length == 1 && parts[0] == command) { singleMatches.push(command) }
    var str = "";
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
    ? ["", "  Invalid Command. Showing Help:", ""].join('\n')
    : "";

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
          ? "|" + cmd._alias
          : "")
        + (cmd.options.length
          ? " [options]"
          : "")
        + " " + args
    , cmd.description()
    ];
  });

  var width = commands.reduce(function(max, command) {
    return Math.max(max, command[0].length);
  }, 0);

  var counts = {};

  var groups = _.uniq(matches.filter(function(cmd) {
    return (String(cmd._name).trim().split(" ").length > commandMatchLength);
  }).map(function(cmd){
    return String(cmd._name).split(" ").slice(0, commandMatchLength).join(" ");
  }).map(function(cmd){
    counts[cmd] = counts[cmd] || 0;
    counts[cmd]++;
    return cmd;
  })).map(function(cmd){
    return "    " + VantageUtil.pad(cmd + " *", width) + "  " + counts[cmd] + " sub-command" + ((counts[cmd] == 1) ? "" : "s") + ".";
  });

  var str = [
      invalidString + "\n  Commands:"
    , ""
    , commands.map(function(cmd) {
      return VantageUtil.pad(cmd[0], width) + "  " + cmd[1];
    }).join("\n").replace(/^/gm, "    ")
    , (groups.length < 1 
      ? ""
      : "\n  Command Groups:\n\n" + groups.join("\n") + "\n")
  ].join("\n");

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
  if (direction == "upstream") {
    this.client.io.emit(str, data);
  } else if (direction == "downstream") {
    if (options.sessionId) {
      var session = _.findWhere(this.server.sessions, { id: options.sessionId });
      if (session) {
        session.io.emit(str, data);
      } else {
        throw new Error("No Sessions!!!! This should not happen...");
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
    if (self.is("proxy")) {
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
  var keyMatch = (["up", "down", "tab"].indexOf(key) > -1);
  var value = (prompt) ? String(prompt.rl.line).trim() : void 0;

  if (this.is("local")) {
      //console.log(e)
    if (keyMatch) {
      var result = this._getKeypressResult(key, value);
      if (result !== undefined) { 
        this._redraw(prompt, result)
      }
    } else if (String(key).toLowerCase() == 'c' && (e.key || {}).ctrl == true) {
      if (this._mode) {
        this._exitMode();
        //e.preventDefault();
        //e.stopPropagation();
        return;
      }
    } else {
      this._histCtr = 0;
    }
  } else {
    this._send("vantage-keypress-upstream", "upstream", { key: key, value: value });
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
  if (["up", "down"].indexOf(key) > -1) {
    return this._getHistory(key);
  } else if (key == "tab") {
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

vantage.listen = function(app, options, cb) {
  this.server.init(app, options, cb);
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
  if (this.is("local") && !this.is("terminable")) {
    if (options.force) {
      process.exit(1);
    } else {
      this.prompt({
        type: "confirm",
        name: "continue",
        default: false,
        message: "This will actually kill this node process. Continue?"
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
      ssn.io.emit("vantage-close-downstream");
    }
  }
};
