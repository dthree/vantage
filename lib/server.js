"use strict";

/**
 * Module dependencies.
 */

var _ = require("lodash")
  , intercept = require("./intercept")
  , Firewall = require("./firewall")
  , stripAnsi = require("strip-ansi")
  , basicAuth = require("vantage-auth-basic")
  ; require("native-promise-only")
  ;

/**
 * Initialize a new `VantageServer` instance.
 *
 * @param {Vantage} parent
 * @return {VantageServer}
 * @api public
 */

function VantageServer(parent) {
  if (!(this instanceof VantageServer)) { return new VantageServer(); }
  this._hooked = false;

  // Sessions are created when you use
  // vantage externally to remotely connect
  // to this running instance of vantage.
  // Every connection (a socket.io connection)
  // is stored as a Session object.
  this.sessions = [];

  this.parent = parent;
  return this;
}

/**
 * VantageServer prototype.
 */

var vantageServer = VantageServer.prototype;

/**
 * Expose `VantageServer`.
 */

exports = module.exports = VantageServer;

/**
 * Gets vantage started as a server.
 *
 * @param {App} app
 * @param {Object} options
 * @return {VantageServer}
 * @api public
 */

vantageServer.init = function(app, options, cb) {
  var self = this;

  // If options is a function, we think it's
  // a callback.
  cb = (_.isFunction(options)) ? options
    : (cb || function(){});

  // If a port is passed in instead of options,
  // accept that by converting it to a filled object.
  // Otherwise, default to an empty object.
  options = (options && _.isFunction(options)) ? {}
    : (options && !_.isObject(options) && !isNaN(options)) ? ({ port: options })
    : (!options) ? {}
    : options;

  // If a port was passed as the 'app', assign it
  // as the port instead.
  options.port =
    (app && !_.isObject(app) && !isNaN(app)) ? app : options.port;

  // If only a port was passed as the app, make the app
  // object a blank function.
  app =
    (app && !_.isObject(app) && !isNaN(app)) ? function(){} : app;

  var appIs =
    (_.isFunction(app)) ? "callback" :
    (_.isObject(app) && _.isFunction(app.callback)) ? "koa" :
    (_.isObject(app) && _.isFunction(app.connection)) ? "hapi" :
    "";

  options = _.defaults(options, {
    port: 80,
    ssl: false,
    logActivity: false
  });


  var appCallback =
    (appIs === "callback") ? app :
    (appIs === "koa") ? app.callback() :
    (appIs === "hapi") ? true :
    void 0;

  if (!appCallback) {
    throw new Error("Unsupported HTTP Server passed into Vantage.");
  }

  if (appIs === "hapi") {
    this.server = app;

    // Create a connection if none exist.
    if (this.server.connections.length === 0) {
      this.server.connection({ port: options.port, labels: "vantage" });
      this.io = require("socket.io")(this.server.listener);
    } else if (this.server.connections.length > 1) {
      // Select a specific connection if more than one exist.
      this.io = require("socket.io")(this.server.select(options.connectionLabel || "vantage").listener);
      delete options.connectionLabel;
    } else {
      this.io = require("socket.io")(this.server.listener);
    }
  } else {
    var type = (options.ssl) ? "https" : "http";
    if (type === "http") {
      this.server = require(type).createServer(appCallback);
    } else {
      this.server = require(type).createServer(options, appCallback);
    }
    this.io = require("socket.io")(this.server);
    this.server.listen(options.port);
  }

  this._port = options.port;
  this._logActivity = options.logActivity;

  this.io.set("authorization", function(handshakeData, accept){

    var address = handshakeData.connection._peername;
    var valid = self.firewall.valid(address);
    var query = handshakeData._query;
    var id = query.id || void 0;
    var ssnId = query.sessionId || void 0;

    // If Vantage has the same unique ID, don't let
    // it connect to itself.
    if (id && (id === self.parent.session.id)) {
      return accept("You can't connect to yourself.", false);
    }
    if (_.map(self.sessions, "id").indexOf(ssnId) > -1) {
      return accept("You have already connected to this instance.", false);
    }

    if (!valid) {
      return accept("IP Not Allowed: " + address, false);
    } else {
      return accept(void 0, true);
    }

  });

  this.firewall = new Firewall();
  this.parent.firewall = this.firewall;

  this.listen(cb);

  this.hook(function(txt) {
    for (var i = 0; i < self.sessions.length; ++i) {
      if (self.sessions[i].pipe) {
        // Inquirer's prompt cleaning seems to randomly
        // spit ANSI code, causing unwanted extra lines.
        // So if we just get ANSI, ignore.
        if (!(txt && txt.length > 1 && stripAnsi(txt).length === 0)) {
          self.parent._send("vantage-stdout-downstream", "downstream", { value: txt, sessionId: self.sessions[i].id });
        }
      }
    }
    return txt;
  });

  return this;
};

/**
 * Creates server socket connections and
 * registers all events.
 *
 * @return {VantageServer}
 * @api private
 */

vantageServer.listen = function(cb) {
  var self = this;
  cb = cb || function(){};

  this.io.on("connection", function(socket) {

    var query = socket.handshake.query;
    var ssn = new self.parent.Session({
      local: false,
      parent: self.parent,
      id: query.sessionId,
      authenticating: true,
      authenticated: false,
      host: socket.handshake.headers.host,
      address: socket.handshake.address
    });

    ssn.server = socket;
    self.sessions.push(ssn);

    // Listens for an event, authenticating
    // the session first.
    function on(str, opts, cbk) {
      cbk = (_.isFunction(opts)) ? opts : cbk;
      cbk = cbk || function() {};
      opts = opts || {};
      ssn.server.on(str, function() {
        if (!ssn.server || (!ssn.authenticating && !ssn.authenticated)) {
          //console.log("Not Authenticated. Closing Session.", ssn.authenticating, ssn.authenticated);
          self.parent._send("vantage-close-downstream", "downstream", { sessionId: ssn.id });
          return;
        }
        cbk.apply(self, arguments);
      });
    }

    on("vantage-keypress-upstream", function(data) {
      self.parent._proxy("vantage-keypress-upstream", "upstream", data).then(function(){
        if ((["up", "down", "tab"].indexOf(data.key) > -1)) {
          var sessn = self.parent.getSessionById(data.sessionId);
          sessn.getKeypressResult(data.key, data.value, function(err, response) {
            self.parent._send("vantage-keypress-downstream", "downstream", { value: (err || response), sessionId: sessn.id });
          });
        } else {
          self.parent._histCtr = 0;
        }
      });
    });

    on("vantage-command-upstream", function(data) {
      self.parent._proxy("vantage-command-upstream", "upstream", data).then(function() {
        if (data.command) {
          var response = {
            command: data.command,
            completed: true,
            error: void 0,
            data: arguments,
            sessionId: data.sessionId
          };
          var execute = function() {
            return new Promise(function(resolve, reject){
              var cmd = {
                command: data.command,
                args: data.args,
                resolve: resolve,
                reject: reject,
                session: self.parent.getSessionById(data.sessionId),
                callback: function() {
                  var args = self.parent.util.fixArgsForApply(arguments);
                  response.data = args;
                  if (args[0] !== undefined) {
                    response.error = args[0] || args[1];
                  }
                  self.parent.emit("server_command_executed", response);
                  self.parent._send("vantage-command-downstream", "downstream", response);
                }
              };
              self.parent._exec(cmd);
            });
          };
          self.parent.emit("server_command_received", {
            command: data.command
          });

          try {
            execute().then(function() {
              response.data = arguments;
              self.parent.emit("server_command_executed", response);
              self.parent._send("vantage-command-downstream", "downstream", response);
            }).catch(function(error){
              response.error = error;
              response.data = void 0;
              self.parent.emit("server_command_error", response);
              self.parent._send("vantage-command-downstream", "downstream", response);
            });
          } catch(e) {
            console.log("Error executing remote command: ", e);
          }
        }
      });
    });

    on("vantage-heartbeat-upstream", function(data) {
      self.parent._proxy("vantage-heartbeat-upstream", "upstream", data).then(function() {
        self.parent._send("vantage-heartbeat-downstream", "downstream", {
          delimiter: self.parent._delimiter,
          sessionId: ssn.id
        });
      });
    });

    on("vantage-close-upstream", function(data) {
      self.parent._proxy("vantage-close-upstream", "upstream", data).then(function() {
        self.parent._send("vantage-close-downstream", "downstream", { sessionId: ssn.id });
      });
    });

    on("vantage-prompt-upstream", function(data) {
      self.parent._proxy("vantage-prompt-upstream", "upstream", data).then(function() {
        self.parent.emit("vantage-prompt-upstream", data);
      });
    });

    on("vantage-auth-upstream", function(data) {
      self.parent._proxy("vantage-auth-upstream", "upstream", data).then(function() {
        self.parent._authenticate(data, function(err, authenticated) {
          self.parent._send("vantage-auth-downstream", "downstream", { sessionId: ssn.id, error: err, authenticated: authenticated });
        });
      });
    });

    ssn.server.on("disconnect", function(data) {

      self.parent.emit("server_disconnect", data);

      var nw = [];
      for (var i = 0; i < self.sessions.length; ++i) {
        if (self.sessions[i].id === ssn.id) {
          //
          if (self.sessions[i].client !== undefined) {
            self.sessions[i].client.close();
          }
          delete self.sessions[i];
        } else {
          nw.push(self.sessions[i]);
        }
      }
      self.sessions = nw;
    });

    if (self.parent._banner) {
      self.parent._send("vantage-banner-downstream", "downstream", { banner: self.parent._banner, sessionId: ssn.id });
    }

    self.parent._send("vantage-heartbeat-downstream", "downstream", { delimiter: self.parent._delimiter, sessionId: ssn.id });

    self.parent.emit("server_connection", socket);
    cb(socket);
  });

  return this;
};

/**
 * Unhooks stdout capture.
 *
 * @return {VantageServer}
 * @api public
 */

vantageServer.unhook = function() {
  if (this._hooked && this._unhook !== undefined && this.sessions.length < 1) {
    this._unhook();
    this._hooked = false;
  }
  return this;
};

/**
 * Imports an authentication middleware
 * module to replace the server's auth
 * function, which is called when a remote
 * instance of vantage connects.
 *
 * @param {Function} middleware
 * @param {Object} options
 * @return {Vantage}
 * @api public
 */

vantageServer.auth = function(middleware, options) {
  middleware = (middleware === "basic") ? basicAuth
    : middleware
    ;

  if (!middleware) {
    this.parent._authFn = void 0;
  } else if (!_.isFunction(middleware)) {
    this.parent._authFn = void 0;
    throw new Error("Invalid middleware string passed into Vantage.auth: " + middleware);
  } else {
    var fn = middleware.call(this.parent, this, options);
    this.parent._authFn = fn;
  }
};

/**
 * Hooks all stdout through a given function.
 *
 * @param {Function} fn
 * @return {VantageServer}
 * @api public
 */

vantageServer.hook = function(fn) {
  if (this._hooked && this._unhook !== undefined) {
    this.unhook();
  }
  this._unhook = intercept(fn);
  this._hooked = true;
  return this;
};
