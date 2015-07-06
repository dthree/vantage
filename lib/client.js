
/**
 * Module dependencies.
 */

var _ = require('lodash')
  , util = require('util')
  , VantageUtil = require('./util')
  ;

/**
 * VantageClient prototype.
 */

var vantageClient = VantageClient.prototype;

/**
 * Expose `VantageClient`.
 */

exports = module.exports = VantageClient;

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
    options = (_.isFunction(options)) ? {} : options;
    options = _.defaults(options, {
      ssl: false,
      user: void 0,
      pass: void 0,
      pipe: false,
      sessionId: self.parent.session.id
    });

    var method = (options.ssl) ? 'https' : 'http';

    self.parent.log('Connecting to ' + server + ':' + port + ' using ' + method + '...');

    var ssn = self.parent.getSessionById(options.sessionId);

    if (!ssn) {
      throw new Error("vantageClient.connect was called with an invalid Session ID: " + options.sessionId);
    }

    ssn.client = require('socket.io-client')(method + '://' + server + ':' + port, {
      "force new connection": true,
      "forceNew": true,
      "secure": true,
      "query": "id=" + self.parent._id + "&sessionId=" + options.sessionId
    });

    ssn.client.on('connect', function() {

      self.parent.is('client', true);

      // Listener cleanup
      self.parent.removeListener('vantage-heartbeat-downstream', start);

      if (!ssn.client) { return; }

      self.parent.emit('client_connect', this);

      ssn.client.on('vantage-banner-downstream', function(data) {
        self.parent._proxy('vantage-banner-downstream', 'downstream', data).then(function(){
          if (data.banner) {
            self.session.log(data.banner);
          }
        });
      });

      ssn.client.on('vantage-keypress-downstream', function(data) {
        self.parent._proxy('vantage-keypress-downstream', 'downstream', data).then(function(){
          if (data.value !== undefined) {
            self.parent._redraw(self.parent._activePrompt, data.value);
          }
        });
      });

      // Command completion.
      ssn.client.on('vantage-command-downstream', function(data) {
        self.parent._proxy('vantage-command-downstream', 'downstream', data).then(function(){
          if (data.completed === true) {
            data.data = VantageUtil.fixArgsForApply(data.data);
            if (self.parent._command) {
              var name = self.parent._command.command;
              var res = self.parent._command.resolve;
              var rej = self.parent._command.reject;
              var cbk = self.parent._command.callback;
              delete self.parent._command;
              self.parent._command = void 0;
              self.parent._queueHandler.call(self.parent);
              if (cbk !== undefined) {
                self.parent.emit('client_command_executed', { command: name });
                cbk.apply(null, data.data);
              } else if (data.error !== undefined && rej !== undefined) {
                self.parent.emit('client_command_error', { command: name, error: data.error });
                rej(data.error);
              } else if (res !== undefined) {
                self.parent.emit('client_command_executed', { command: name });
                res(data.data);
              }
            }
            self.parent._prompt({ sessionId: data.sessionId });
          }
        });
      });

      ssn.client.on('vantage-stdout-downstream', function(data) {
        self.parent._proxy('vantage-stdout-downstream', 'downstream', data).then(function(){
          var stdout = data.value || '';
          stdout = 
            (util.inspect(stdout.slice(stdout.length-2, stdout.length).trim() == '\n'))
            ? stdout.slice(0, stdout.length-1) 
            : stdout;
          self.session.log(stdout);
        });
      });

      ssn.client.on('vantage-heartbeat-downstream', function(data){
        self.parent._proxy('vantage-heartbeat-downstream', 'downstream', data).then(function(){
          if (data.delimiter) {
            self.parent._tempDelimiter(data.delimiter, { sessionId: data.sessionId });
          }
          self.parent.emit('vantage-heartbeat-downstream');
        });
      });

      ssn.client.on('vantage-delimiter-downstream', function(data){
        self.parent._proxy('vantage-delimiter-downstream', 'downstream', data).then(function(){
          if (data.value) {
            self.parent._tempDelimiter(data.value, { sessionId: data.sessionId });
          }
          self.parent.emit('vantage-delimiter-downstream');
        });
      });

      ssn.client.on('vantage-prompt-downstream', function(data) {
        self.parent._proxy('vantage-prompt-downstream', 'downstream', data).then(function(){
          // Set local prompt delimiter to question 
          // from upstream prompt command.
          self.parent._tempDelimiter(data.options.message);
          self.parent.inquirer.prompt(data.options, function(result){
            // Reset local prompt delimiter.
            self.parent._tempDelimiter(self.parent._origdelimiter);
            // Pipe prompt response back upstream so command
            // execution can continue.
            self.parent._send('vantage-prompt-upstream', 'upstream', { value: result, sessionId: data.sessionId });
          });
        });
      });

      ssn.client.on('vantage-close-downstream', function(data){
        ssn.client.close();
        if (self.parent._command !== undefined) {
          var name = self.parent._command.command;
          var res = self.parent._command.resolve;
          var cbk = self.parent._command.callback;
          delete self.parent._command;
          self.parent._command = void 0;
          self.parent._queueHandler.call(self.parent);
          if (cbk !== undefined) {
            cbk(void 0, 'Exited successfully.');
          } else if (res !== undefined) {
            res('Exited successfully.');
          }
          self.parent.emit('client_command_executed', { command: name });

        } else {
          self.parent._send('vantage-command-downstream', 'downstream', { completed: true, data: 'Exited successfully.', sessionId: data.sessionId });
        }
      });

      ssn.client.on('vantage-resume-downstream', function(data) {
        self.parent._proxy('vantage-resume-downstream', 'downstream', data).then(function(){
          self.parent._prompt({ sessionId: data.sessionId });
        });
      });

      ssn.client.on('vantage-ssn-stdout-downstream', function(data) {
        self.parent._proxy('vantage-ssn-stdout-downstream', 'downstream', data).then(function() {
          var ssn = self.parent.getSessionById(data.sessionId);
          if (ssn) {
            ssn.log(data.value);
          };
        });
      }); 

      self.parent.exec('__authenticate', {
        handshake: (ssn.client.opts || {}),
        user: options.user,
        pass: options.pass,
        sessionId: ssn.id
      }, function(msg, authenticated) {
        if (authenticated !== true) {
          self.parent._send("vantage-close-upstream", "upstream", { sessionId: ssn.id });
        }
        if (authenticated) {
          ssn.user = options.user || "guest";
          self.parent.on('vantage-heartbeat-downstream', start);
          self.parent._send("vantage-heartbeat-upstream", "upstream", { sessionId: ssn.id });
          resolve(void 0);
          cb(void 0);
        } else {
          reject(msg);
          cb(true, msg);
        }
      });
      
      function start() {
        //self.parent._prompt();
      }

    });

    var errorHandler = function(e, data) {
      var description = 
        (_.isObject(e)) ? ((e.description == 503) ? '503 Service Unavailable' : e.description)
        : e;
      var ssn = self.parent.getSessionById(options.sessionId);
      ssn.log('Error connecting: '.yellow + description);
      if (ssn.client) {
        ssn.client.close();
      }
      if (ssn.isLocal()) {
        self.parent._prompt({ sessionId: ssn.id });
      }
      reject('Error connecting: ' + description);
      cb('Error connecting: ' + description);
    }

    ssn.client.on('connect_error', function(err, data) {
      self.parent.emit('client_connect_error', err);
      return errorHandler.call(self, err, data);      
    });

    ssn.client.on('error', function(err){
      self.parent.emit('client_error', err);
      return errorHandler(err);
    });

    ssn.client.on('disconnect', function(data) {
      self.parent.emit('client_disconnect', data);
      self.parent.is('client', false);  // to do remove
      // Reset delimiter back.
      self.parent._tempDelimiter(self.parent._origdelimiter, { sessionId: ssn.id });
      if (!ssn.isLocal()) {
        self.parent._send('vantage-heartbeat-downstream', 'downstream', {
          delimiter: self.parent._delimiter,
          sessionId: ssn.id
        });
      } else {
        self.parent._prompt({ sessionId: ssn.id });
      }
    });

  });

};