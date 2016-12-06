"use strict";

/**
 * Module dependencies.
 */

var _ = require("lodash")
  , util = require("util")
  , chalk = require("chalk")
  ; require("native-promise-only")
  ;

/**
 * Initialize a new `VantageClient` instance.
 *
 * @param {Vantage} parent
 * @return {VantageClient}
 * @api public
 */

function VantageClient(parent) {
  this.parent = parent;
  // Sessions are created when you use
  // vantage as a client to connect to
  // other instances of vantage.
  this.sessions = [];

  return this;
}

/**
 * VantageClient prototype.
 */

var vantageClient = VantageClient.prototype;

/**
 * Expose `VantageClient`.
 */

exports = module.exports = VantageClient;

/**
 * Connects to another listening vantage server.
 *
 * @param {String} server
 * @param {Integer} port
 * @param {Object} options
 * @param {Function} cb
 * @return {Promise}
 * @api public
 */

vantageClient.connect = function(server, port, options, cb) {
  var self = this;

  return new Promise(function(resolve, reject) {

    // Callback can be passed in the options parameter, if
    // no options are needed.
    cb = (_.isFunction(options)) ? options : (cb || function(){});
    options = (!options || _.isFunction(options)) ? {} : options;
    options = _.defaults(options, {
      ssl: false,
      user: void 0,
      pass: void 0,
      pipe: false,
      sessionId: self.parent.session.id
    });

    var method = (options.ssl) ? "https" : "http";

    var ssn = self.parent.getSessionById(options.sessionId);

    ssn.log("Connecting to " + server + ":" + port + " using " + method + "...");

    if (!ssn) {
      throw new Error("vantageClient.connect was called with an invalid Session ID: " + options.sessionId);
    }

    ssn.client = require("socket.io-client")(method + "://" + server + ":" + port, {
      "force new connection": true,
      "forceNew": true,
      "secure": true,
      "query": "id=" + self.parent.session.id + "&sessionId=" + options.sessionId,
      "reconnection": true,
      "reconnectionDelay": 1000,
      "reconnectionAttempts": 1
    });

    ssn.client.on("connect", function() {

      if (!ssn.client) { return; }
      self.parent.emit("client_connect", this);

      ssn.client.on("vantage-banner-downstream", function(data) {
        self.parent._proxy("vantage-banner-downstream", "downstream", data).then(function(){
          if (data.banner) {
            ssn.log(data.banner);
          }
        });
      });

      ssn.client.on("vantage-keypress-downstream", function(data) {
        self.parent._proxy("vantage-keypress-downstream", "downstream", data).then(function(){
          if (data.value !== undefined) {
            if (_.isArray(data.value)) {
              self.parent.ui.imprint();
              ssn.log(data.value);
            } else {
              self.parent.ui.input(data.value);
            }
          }
        });
      });

      // Command completion.
      ssn.client.on("vantage-command-downstream", function(data) {
        self.parent._proxy("vantage-command-downstream", "downstream", data).then(function(){
          if (data.completed === true) {
            data.data = self.parent.util.fixArgsForApply(data.data);
            if (self.parent._command) {
              if (self.parent._command.command !== data.command) {
                console.log("Downstream command does not match stored comand: ", data.command, " -vs -", self.parent._command.command);
              }
              var name = self.parent._command.command;
              var res = self.parent._command.resolve;
              var rej = self.parent._command.reject;
              var cbk = self.parent._command.callback;
              delete self.parent._command;
              self.parent._command = void 0;
              try {
                self.parent._queueHandler.call(self.parent);
              } catch(e) {
                console.log("Error on vantage command downstream: ", e.stack);
              }

              if (cbk !== undefined) {
                self.parent.emit("client_command_executed", { command: name });
                cbk.apply(null, data.data);
              } else if (data.error !== undefined && rej !== undefined) {
                self.parent.emit("client_command_error", { command: name, error: data.error });
                try {
                  rej(data.error);
                } catch(e) {
                  console.log("Error calling Promise reject on vantage command downstream: ", e);
                }
              } else if (res !== undefined) {
                self.parent.emit("client_command_executed", { command: name });
                if (data.error === undefined && _.isArray(data.data) && data.data.length === 2) {
                  data.data.shift();
                }
                try {
                  res.apply(null, data.data);
                } catch(e) {
                  console.log("Error calling Promise resolve on vantage command downstream: ", e);
                }
              }
            }
            if (!self.parent.ui.midPrompt()) {
              self.parent._prompt({ sessionId: data.sessionId });
            }
          } else {
            console.log("Vantage command downstream was called with no completed boolean.");
            console.trace();
          }
        });
      });

      ssn.client.on("vantage-stdout-downstream", function(data) {
        self.parent._proxy("vantage-stdout-downstream", "downstream", data).then(function(){
          var stdout = data.value || "";
          stdout =
            (_.isString(stdout) && (util.inspect(stdout.slice(stdout.length - 2, stdout.length).trim() === "\n")))
            ? stdout.slice(0, stdout.length - 1)
            : stdout;
          ssn.log(stdout);
        });
      });

      ssn.client.on("vantage-heartbeat-downstream", function(data){
        self.parent._proxy("vantage-heartbeat-downstream", "downstream", data).then(function(){
          if (data.delimiter) {
            ssn.delimiter(data.delimiter);
          }
          self.parent.emit("vantage-heartbeat-downstream");
        });
      });

      ssn.client.on("vantage-mode-delimiter-downstream", function(data){
        self.parent._proxy("vantage-mode-delimiter-downstream", "downstream", data).then(function(){
          if (typeof data.value !== "undefined") {
            ssn.modeDelimiter(data.value);
            self.parent.emit("vantage-mode-delimiter-downstream");
          }
        });
      });

      ssn.client.on("vantage-delimiter-downstream", function(data){
        self.parent._proxy("vantage-delimiter-downstream", "downstream", data).then(function(){
          if (data.value) {
            ssn.delimiter(data.value);
            self.parent.emit("vantage-delimiter-downstream");
          }
        });
      });

      ssn.client.on("vantage-prompt-downstream", function(data) {
        self.parent._proxy("vantage-prompt-downstream", "downstream", data).then(function(){
          data = data || {};
          data.options = data.options || {};
          // Set local prompt delimiter to question
          // from upstream prompt command.
          if (self.parent.ui.midPrompt()) {
            self.parent.ui.pause();
          }
          self.parent.ui.setDelimiter(data.options.message || ssn.delimiter);
          self.parent.ui.prompt(data.options, function(result) {
            // Reset local prompt delimiter.
            self.parent.ui.setDelimiter(ssn.delimiter);
            // Pipe prompt response back upstream so command
            // execution can continue.
            self.parent._send("vantage-prompt-upstream", "upstream", { value: result, sessionId: data.sessionId });
          });
        });
      });

      ssn.client.on("vantage-close-downstream", function(data){
        ssn.client.close();
        if (self.parent._command !== undefined) {
          var name = self.parent._command.command;
          var res = self.parent._command.resolve;
          var cbk = self.parent._command.callback;
          delete self.parent._command;
          self.parent._command = void 0;
          self.parent._queueHandler.call(self.parent);
          if (name.indexOf("exit") > -1) {
            if (cbk !== undefined) {
              cbk(void 0, "Exited successfully.");
            } else if (res !== undefined) {
              res("Exited successfully.");
            }
            self.parent.emit("client_command_executed", { command: name });
          }

        } else {
          self.parent._send("vantage-command-downstream", "downstream", { completed: true, data: "Exited successfully.", sessionId: data.sessionId, command: "exit" });
        }
      });

      ssn.client.on("vantage-resume-downstream", function(data) {
        self.parent._proxy("vantage-resume-downstream", "downstream", data).then(function(){
          self.parent._prompt({ sessionId: data.sessionId });
        });
      });

      ssn.client.on("vantage-ssn-stdout-downstream", function(data) {
        self.parent._proxy("vantage-ssn-stdout-downstream", "downstream", data).then(function() {
          var sessn = self.parent.getSessionById(data.sessionId);
          if (sessn) {
            sessn.log.apply(sessn, data.value);
          }
        });
      });

      if (ssn.isLocal() && self.parent.ui.midPrompt()) {
        self.parent.ui.pause();
      }

      ssn.client.on("vantage-auth-downstream", function(data){
        data = data || {};
        var error = data.error;
        var authenticated = data.authenticated;
        if (authenticated === true) {
          ssn.user = options.user || "guest";
          resolve(void 0);
          cb(void 0);
        } else {
          self.parent._send("vantage-close-upstream", "upstream", { sessionId: ssn.id });
          reject(error || authenticated);
          cb(true, error || authenticated);
        }
      });

      var authData = {
        handshake: (ssn.client.io.opts || {}),
        user: options.user,
        pass: options.pass,
        sessionId: ssn.id,
        client: options
      };

      self.parent._send("vantage-auth-upstream", "upstream", authData);
    });

    function disconnect(data) {
      self.parent.emit("client_disconnect", data);
      if (ssn.client) {
        ssn.client.close();
      }
      if (!ssn.isLocal()) {
        self.parent._send("vantage-heartbeat-downstream", "downstream", {
          delimiter: self.parent._delimiter,
          sessionId: ssn.id
        });
      } else {
        ssn.delimiter(self.parent._delimiter);
        self.parent._prompt({ sessionId: ssn.id });
      }
      delete ssn.client;
      ssn.client = void 0;
    }

    ssn.client.on("connect_error", function(err) {
      self.parent.emit("client_connect_error", err);
      var sessn = self.parent.getSessionById(options.sessionId);
      var description =
        (_.isObject(err)) ? ((err.description === 503) ? "503 Service Unavailable" : err.description)
        : err;
      sessn.log(chalk.yellow("Connection Error: ") + description);
      disconnect(err);
      reject("Connection Error: " + description);
      cb("Error connecting: " + description);
    });

    ssn.client.on("error", function(err){
      self.parent.emit("client_error", err);
      ssn.log(err);
      disconnect(err);
      reject("Connection Error: " + err);
      cb("Error connecting: " + err);
    });

    ssn.client.on("disconnect", function(data) {
      self.parent.emit("client_disconnect", data);
      // Reset delimiter back.
      if (!ssn.isLocal()) {
        self.parent._send("vantage-heartbeat-downstream", "downstream", {
          delimiter: self.parent._delimiter,
          sessionId: ssn.id
        });
      } else {
        ssn.delimiter(self.parent._delimiter);
        self.parent._prompt({ sessionId: ssn.id });
      }
      delete ssn.client;
      ssn.client = void 0;
    });
  });
};
