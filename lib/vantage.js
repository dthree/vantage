
/**
 * Module dependencies.
 */

var _ = require("lodash")
  , EventEmitter = require("events").EventEmitter
  , Command = require("./command")
  , VantageServer = require("./server")
  , VantageClient = require("./client")
  , VantageUtil = require("./util")
  , ui = require('./ui')
  , Session = require('./session')
  , intercept = require("./intercept")
  , commons = require("./vantage-commons")
  , basicAuth = require("./vantage-auth-basic")
  , os = require("os")
  , inquirer = require("inquirer")
  , minimist = require("minimist")
  , npm = require("npm")
  , repl = require("vantage-repl")
  , temp = require("temp")
  , chalk = require("chalk")
  ; require("native-promise-only")
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

  // Queue of IP requests, executed async, in sync.
  this._queue = [];

  // Current command being executed.
  this._command = void 0;

  // Expose UI.
  this.ui = ui;

  // Exposed through vantage.delimiter(str).
  this._delimiter = "local@" + String(os.hostname()).split(".")[0] + "~$ ";
  ui.setDelimiter(this._delimiter);

  // Banner to display on login to a system. If null,
  // doesn't display a banner.
  this._banner = void 0;

  // Vantage client connects to other instances
  // of Vantage.
  this.client = new VantageClient(this);

  // Vantage server receives connections from
  // other vantages. Activated by vantage.listen();
  this.server = new VantageServer(this);

  // Whether all stdout is being hooked through a function.
  this._hooked = false;

  // Expose common utilities, like padding.
  this.util = VantageUtil;

  // If authentication is used, it is called through this fn.
  this._authFn = void 0;

  // Active vantage server session.
  this.session = new Session({
    local: true,
    user: "local",
    parent: this,
    delimiter: this._delimiter
  });

  this._init();
  return this;
}

/**
 * Extension to `constructor`.
 * @api private
 */

Vantage.prototype._init = function() {
  var self = this;

  //ui.init();

  ui.on("vantage_ui_keypress", function(data){
    self._onKeypress(data.key, data.value);
  });

  ui.on("vantage_delimiter_change", function(){

  });

  self
    .use(commons)
    .use(repl);

  // to do
  //self.hook();
  //self.show();
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
  this._delimiter = str;
  if (this.session.isLocal() && !this.session.client) {
    this.session.delimiter(str);
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

vantage._tempDelimiter = function(str, options) {
  var self = this;
  options = options || {}
  var ssn = self.getSessionById(options.sessionId);
  if (!ssn || ssn.isLocal()) {
    ui.delimiter(ssn.delimiter());
  } else {
    this._send("vantage-delimiter-downstream", "downstream", { value: str, sessionId: (ssn || {}).id });
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
  console.trace("WTF VANTAGE.IS CALLED");
  return;
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
  this.ui.log.apply(this.ui, arguments);
  return;
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

vantage.pipe = function(fn) {
  if (this.ui) {
    this.ui._pipeFn = fn;
  } 
  //this.hook(this._pipeFn);
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

vantage.hook = function(fn) {
  var self = this;
  if (fn !== undefined) {
    this._hook(fn);
  } else {
    this._unhook();
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
  ui.attach(this);
  //this._prompt({ sessionId: this.session.id }); // to do?
  return this;
};

vantage.isAttached = function() {
  if (this.ui.parent && this.ui.parent.session.id == this.session.id) {
    return true;
  } else {
    return false;
  }
}

/**
 * Disables the vantage prompt on the
 * local terminal.
 *
 * @return {Vantage}
 * @api public
 */

vantage.hide = function() {
  ui.detach(this);
  return this;
};



vantage._onKeypress = function(key, value) {
  if (this.session.isLocal() && !this.session.client) {
    var result = this.session.getKeypressResult(key, value);
    if (result !== undefined) {
      this.ui.redraw(result);
    }
  } else {
    this._send("vantage-keypress-upstream", "upstream", {
      key: key,
      value: value,
      sessionId: this.session.id
    });
  }
},



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
  var ssn = self.getSessionById(options.sessionId);

  if (!ssn) {
    throw new error("Vantage.prompt was called without a passed Session ID.");
    return;
  }

  if (ssn.isLocal()) {
    ui.setDelimiter(options.message || ssn.delimiter);
    ui.prompt(options, function(result) {
      ui.setDelimiter(ssn.delimiter);
      cb(result);
    });
  } else {
    function handler(data) {
      var response = data.value;
      self.removeListener("vantage-prompt-upstream", handler);
      cb(response);
    }
    self.on("vantage-prompt-upstream", handler);
    self._send("vantage-prompt-downstream", "downstream", { options: options, value: void 0, sessionId: ssn.id });
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

vantage._prompt = function(data) {

  var self = this;

  data = data || {}
  if (!data.sessionId) {
    data.sessionId = self.session.id;
    //throw new Error("No Session ID passed into vantage._prompt.");
  }

  var ssn = self.getSessionById(data.sessionId);

  // If we somehow got to _prompt and aren't the
  // local client, send the command downstream.
  if (!ssn.isLocal()) {
    this._send("vantage-resume-downstream", "downstream", { sessionId: data.sessionId });
    return;
  }

  if (ui.midPrompt()) { return; }

  ui.prompt({
    type: "input",
    name: "command",
    message: ssn.fullDelimiter(),
  }, function(result){
    if (self.ui._cancelled == true) { self.ui._cancelled = false; return; }
    var str = String(result.command).trim();
    self.emit("client_prompt_submit", str);
    if (str == "" || str == "undefined") { self._prompt(data); return; }
    self.exec(str, function(){
      self._prompt(data);
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

vantage.exec = function(cmd, args, cb) {
  var self = this
    , cb = (_.isFunction(args)) ? args : cb
    , ssn = self.session
    , args = args || {}
    ;


  if (args.sessionId) {
    ssn = self.getSessionById(args.sessionId);
  }

  var command = {
    command: cmd,
    args: args,
    callback: cb,
    session: ssn
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
  } else if (this._queue.length > 1) {
    //console.log("queue backlog mid command...")
  } else {
    //console.log("WE DO NOTHIN...")
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
    //console.log("ACID", cmd.session.isLocal(), (cmd.session.client !== undefined), cmd.session.id)
  if (cmd.session.isLocal() && !cmd.session.client) {  // to do we have to make sure we kill the client when it dies.
    this._exec(cmd);
  } else {
    self._command = cmd;
    self._send('vantage-command-upstream', 'upstream', { command: cmd.command, args: cmd.args, completed: false, sessionId: cmd.session.id });
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

  if (!item.session) {
    throw new Error("Fatal Error: No session was passed into command for execution: " + item);
    return;
  }

  if (String(item.command).indexOf("undefine") > -1) {
    console.trace("Undefined ._exec command passed.");
    throw new Error("vantage._exec was called with an undefined command.");
    process.exit(1);
    return;
  }

  item.command = item.command  || "";
  modeCommand = item.command;
  item.command = (item.session._mode) ? item.session._mode : item.command;
  parts = item.command.split(" ");

  // History for our "up" and "down" arrows.
  item.session.history((item.session._mode ? modeCommand : item.command));

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
      , afterFn = match._after
      , init = match._init || (function(args, cb) { cb(); })
      , delimiter = match._delimiter || String(item.command).toLowerCase() + ':'
      , origArgs = match._args
      , origOptions = match.options
      ;

    args.options = {}

    // Looks for a help arg and throws help if any.
    if (parsedArgs.help || parsedArgs.h || parsedArgs['_'].indexOf('/?') > -1) {
      if (!match._hidden) {
        item.session.log(match.helpInformation());
      }
      item.callback(); return;
    }

    // looks for ommitted required args
    // and throws help.
    for (var i = 0; i < origArgs.length; ++i) {
      var exists = parsedArgs._[i];
      if (!exists && origArgs[i].required === true) {
        item.session.log(" ");
        item.session.log("  Missing required argument. Showing Help:");
        item.session.log(match.helpInformation());
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
        item.session.log(" ");
        item.session.log("  Missing required option. Showing Help:");
        item.session.log(match.helpInformation());
        item.callback('Missing required option.');
        return;
      }
      if (exists !== undefined) {
        args.options[long || short] = exists;
      }
    }

    // If this command throws us into a "mode",
    // prepare for it.
    if (match._mode === true && !item.session._mode) {
      // Assign vantage to be in a "mode".
      item.session._mode = item.command;
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

      item.session.modeDelimiter(delimiter);
      // _delimiterCache;
      //self._delimiterCache = self._delimiter;
      //self._tempDelimiter(self._delimiter + delimiter, { sessionId: item.session.id });

    } else if (item.session._mode) {

      if (String(modeCommand).trim() == 'exit') {
        self._exitMode({ sessionId: item.session.id });
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

    // If args were passed into the programmatic
    // `vantage.exec(cmd, args, callback)`, merge
    // them here.
    if (item.args && _.isObject(item.args)) {
      args = _.extend(args, item.args);
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
    var res = fn.call(item.session, args, function(data) {
      self.emit('client_command_executed', { command: item.command });
      arguments = VantageUtil.fixArgsForApply(arguments);

      var error = arguments[0];
      //arguments.shift();
      if (item.callback) {
        //console.log("NOW I CALL CB", item.callback, arguments)
        item.callback.apply(self, arguments);
        if (afterFn) { afterFn.call(item.session, args); }
      } else {
        /*
        if (item.resolve !== undefined) {
          return item.resolve.apply(self, arguments);
        }
        */
        // maybe i do this?
        if (error !== undefined && item.reject !== undefined) {
          return item.reject.apply(self, arguments);
          if (afterFn) { afterFn.call(item.session, args); }
        } else if (item.resolve !== undefined) {
          return item.resolve.apply(self, arguments);
          if (afterFn) { afterFn.call(item.session, args); }
        }
        
      }
    });

    // If the Vantage API function as declared by the user
    // returns a promise, then we do this.
    if (res && _.isFunction(res.then)) {
      return res.then(function(data){
        if (item.session.isLocal()) {
          self.emit('client_command_executed', { command: item.command });
        }
        if (item.callback !== undefined) {
          item.callback(void 0, data); // hmmm changed...
          if (afterFn) { afterFn.call(item.session, args); }
        } else if (item.resolve !== undefined) {
          return item.resolve(data);
          if (afterFn) { afterFn.call(item.session, args); }
        }
      }).catch(function(err) {
        item.session.log(chalk.red("Error: ") + err);
        if (item.session.isLocal()) {
          self.emit('client_command_error', { command: item.command, error: err });
        }
        if (item.callback !== undefined) {
          item.callback(true, err);
          if (afterFn) { afterFn.call(item.session, args); }
        } else if (item.reject !== undefined) {
          item.reject(err);
          if (afterFn) { afterFn.call(item.session, args); }
        }
      });
    }
  } else {
    // If no command match, just return.
    item.session.log(this._commandHelp(item.command));

    // To do - if `exec` uses Promises,
    // I think we need to return a promise here...
    item.callback();
  }
};

vantage.auth = function(middleware, options) {
  middleware = (middleware === "basic") ? basicAuth
    : middleware
    ;

  if (!middleware) {
    this._authFn = void 0;
  } else if (!_.isFunction(middleware)) {
    throw new Error("Invalid middleware string passed into Vantage.auth: " + middleware);
    this._authFn = void 0;
  } else {
    var fn = middleware.call(this, this, options);
    this._authFn = fn;
  }
}

/**
 * Calls authentication middleware
 *
 * @api private
 */

vantage._authenticate = function(args, cb) {
  var self = this;
  //console.log("AUTH CALLEd", args)
  var ssn = this.getSessionById(args.sessionId);
  if (!this._authFn) {
    ssn.authenticating = false;
    ssn.authenticated = true;
    cb(void 0, true);
  } else {
    //console.log("prompt pause?", self.ui.midPrompt())
    //if (self.ui.midPrompt()) {
      //self.ui.pause();
    //}
    this._authFn.call(ssn, args, function(msg, authenticated) {
      ssn.authenticating = false;
      ssn.authenticated = authenticated;
      if (authenticated === true) {
        cb(void 0, true);
      } else {
        cb(msg);
      }
    });
  }
};

/**
 * Exits out of a give "mode" one is in.
 * Reverts history and delimiter back to
 * regular vantage usage.
 *
 * @api private
 */

vantage._exitMode = function(options) {

  var ssn = this.getSessionById(options.sessionId)
  ssn._mode = false;
  this._hist = this._histCache;
  this._histCtr = this._histCtrCache;
  this._histCache = [];
  this._histCtrCache = 0;
  ssn.modeDelimiter(false);
  //this._tempDelimiter(this._delimiterCache, { sessionId: options.sessionId });
  //this._delimiterCache = void 0;
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
    if (parts.length == 1 && parts[0] == command && !this.commands[i]._hidden) { singleMatches.push(command) }
    var str = "";
    for (var j = 0; j < parts.length; ++j) {
      str = String(str + ' ' + parts[j]).trim();
      if (str == command && !this.commands[i]._hidden) {
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
    return !cmd._hidden;
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
  data = data || {}
  var ssn = this.getSessionById(data.sessionId);
  if (!ssn) {
    throw new Error("No Sessions logged for ID " + data.sessionId + " in vantage._send.");
  }
  if (direction == "upstream") {
    if (ssn.client) {
      ssn.client.emit(str, data);
    } else {
      //throw new Error("No session client on vantage send upstream."); to do hmmm...
    }
  } else if (direction == "downstream") {
    if (ssn.server) {
      ssn.server.emit(str, data);
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
    var ssn = self.getSessionById(data.sessionId);
    if (ssn && (!ssn.isLocal() && ssn.client)) { // to do we have to make sure we kill the client when it dies.
      //console.log("AND UP!!", ssn.isLocal(), ssn.client === undefined);
      self._send(str, direction, data, options);
    } else {
      //console.log("and now running command", data.command);
      resolve();
    }
  });
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
 * Returns session by id.
 *
 * @param {Integer} id
 * @return {Session}
 * @api public
 */

vantage.getSessionById = function(id) {
  if (_.isObject(id)) {
    throw new Error("vantage.getSessionById: id " + JSON.stringify(id) + " should not be an object.")
  }
  var ssn = _.findWhere(this.server.sessions, { id: id });
  ssn = (this.session.id === id) ? this.session : ssn;
  if (!id) {
    throw new Error("vantage.getSessionById was called with no ID passed.");
  }
  if (!ssn) {
    var sessions = {
      local: this.session.id,
      server: _.pluck(this.server.sessions, "id")
    }
    throw new Error("No session found for id " + id + " in vantage.getSessionById. Sessions: " + JSON.stringify(sessions));
  }
  return ssn;
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
  var ssn = this.getSessionById(options.sessionId);
  if (ssn.isLocal()) {
    if (options.force) {
      process.exit(1);
    } else {
      this.prompt({
        type: "confirm",
        name: "continue",
        default: false,
        message: "This will actually kill this node process. Continue?",
        sessionId: ssn.id
      }, function(result){
        if (result.continue) {
          process.exit(1);
        } else {
          self._prompt({ sessionId: ssn.id });
        }
      });
    }
  } else {
    ssn.server.emit("vantage-close-downstream", { sessionId: ssn.id });
  }
};


process.on("uncaughtException", function(e){
  console.log("UNCAUGHT EXCEPTION", e);
})
