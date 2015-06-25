
/**
 * Module dependencies.
 */

var _ = require('lodash')
  , util = require('util')
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
    });

    var method = (options.ssl) ? 'https' : 'http';

    self.parent.log('Connecting to ' + server + ':' + port + ' using ' + method + '...');

    self.io = require('socket.io-client')(method + '://' + server + ':' + port, {
      "force new connection": true,
      "secure": true,
      "query": "id=" + self.parent._id
    });

    self.io.on('connect', function(a) {

      self.parent.is('client', true);

      if (!self.io) { return; }

      self.parent.emit('client_connect', a);

      self.io.on('vantage-banner-downstream', function(data) {
        self.parent._proxy('vantage-banner-downstream', 'downstream', data).then(function(){
          if (data.banner) {
            self.parent.log(data.banner);
          }
        });
      });

      self.io.on('vantage-keypress-downstream', function(data) {
        self.parent._proxy('vantage-keypress-downstream', 'downstream', data).then(function(){
          if (data.value !== undefined) {
            self.parent._redraw(self.parent._activePrompt, data.value);
          }
        });
      });

      // Command completion.
      self.io.on('vantage-command-downstream', function(data) {
        self.parent._proxy('vantage-command-downstream', 'downstream', data).then(function(){
          if (data.completed === true) {
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
                cbk(data.error, data.data);
              } else if (data.error !== undefined && rej !== undefined) {
                self.parent.emit('client_command_error', { command: name, error: data.error });
                rej(data.error);
              } else if (res !== undefined) {
                self.parent.emit('client_command_executed', { command: name });
                res(data.data);
              }
            }
            self.parent._prompt();
          }
        });
      });

      self.io.on('vantage-stdout-downstream', function(data) {
        self.parent._proxy('vantage-stdout-downstream', 'downstream', data).then(function(){
          var stdout = data.value || '';
          stdout = 
            (util.inspect(stdout.slice(stdout.length-2, stdout.length).trim() == '\n'))
            ? stdout.slice(0, stdout.length-1) 
            : stdout;
          self.parent.log(stdout);
        });
      });

      self.io.on('vantage-heartbeat-downstream', function(data){
        self.parent._proxy('vantage-heartbeat-downstream', 'downstream', data).then(function(){
          if (data.delimiter) {
            self.parent._tempDelimiter(data.delimiter);
          }
          self.parent.emit('vantage-heartbeat-downstream');
        });
      });

      self.io.on('vantage-delimiter-downstream', function(data){
        self.parent._proxy('vantage-delimiter-downstream', 'downstream', data).then(function(){
          if (data.value) {
            self.parent._tempDelimiter(data.value);
          }
          self.parent.emit('vantage-delimiter-downstream');
        });
      });

      self.io.on('vantage-prompt-downstream', function(data){
        self.parent._proxy('vantage-prompt-downstream', 'downstream', data).then(function(){
          // Set local prompt delimiter to question 
          // from upstream prompt command.
          self.parent._tempDelimiter(data.options.message);
          self.parent.inquirer.prompt(data.options, function(result){
            // Reset local prompt delimiter.
            self.parent._tempDelimiter(self.parent._origdelimiter);
            // Pipe prompt response back upstream so command
            // execution can continue.
            self.parent._send('vantage-prompt-upstream', 'upstream', { value: result });
          });
        });
      });

      self.io.on('vantage-close-downstream', function(data){
        self.io.close();
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
          self.parent._send('vantage-command-downstream', 'downstream', { completed: true, data: 'Exited successfully.' });
        }
      });

      self.io.on('vantage-resume-downstream', function(data) {
        self.parent._proxy('vantage-resume-downstream', 'downstream', data).then(function(){
          self.parent._prompt();
        });
      });

      self.parent.hook();

      var start = function() {
        self.parent._prompt();
      }

      self.parent.on('vantage-heartbeat-downstream', start);

      resolve();
      cb();
    });

    var errorHandler = function(e, data) {
      var description = 
        (_.isObject(e)) ? ((e.description == 503) ? '503 Service Unavailable' : e.description)
        : e;
      self.parent.log('Error connecting: '.yellow + description);
      if (self.parent.is('terminable')) {
        process.exit(1);
      } else {
        if (self.io) {
          self.io.close();
        }
        self.parent._prompt();
      }
      reject('Error connecting: ' + description);
      cb('Error connecting: ' + description);
    }

    self.io.on('connect_error', function(err, data) {
      self.parent.emit('client_connect_error', err);
      return errorHandler.call(self, err, data);      
    });

    self.io.on('error', function(err){
      self.parent.emit('client_error', err);
      return errorHandler(err);
    });

    self.io.on('disconnect', function(data){
      self.parent.emit('client_disconnect', data);
      self.parent.is('client', false);
      if (self.parent.is('server')) {
        self.parent._tempDelimiter(self.parent._origdelimiter);
        self.parent._send('vantage-heartbeat-downstream', 'downstream', {
          delimiter: self.parent._delimiter,
        });
      } else {
        if (self.parent.is('local')) {
          self.parent._tempDelimiter(self.parent._origdelimiter);
          self.parent._prompt();
        }
      }
      // This was causing problems... not sure if
      // removing it will cause more problems...
      //delete self.io;
    });

  });

};