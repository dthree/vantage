var _ = require('lodash')
  , util = require('util')

exports = module.exports = VantageClient;

var vantageClient = VantageClient.prototype;

function VantageClient(parent) {
  this.parent = parent;
  return this;
}

vantageClient.connect = function(server, port, options, cb) {

  var self = this;

  return new Promise(function(resolve, reject) { 

    cb = cb || function() {}
    options = _.defaults(options, {
      ssl: false,
    });

    var method = (options.ssl) ? 'https' : 'http';

    self.parent.log('Connecting to ' + server + ':' + port + ' using ' + method + '...');

    self.io = require('socket.io-client')(method + '://' + server + ':' + port, {
      'force new connection': true,
      'secure': true,
    });

    self.io.on('connect', function(a) {

      //console.log('CONNCETED...' + self.parent.server._port)

      self.parent.is('client', true);

      if (!self.io) {
        return;
      }

      self.io.on('vantage-keypress-downstream', function(data) {
        self.parent._proxy('vantage-keypress-downstream', 'downstream', data).then(function(){
          if (data.value !== undefined) {
            self.parent.redraw(self.parent._activePrompt, data.value);
          }
        });
      });

      // Command completion.
      self.io.on('vantage-command-downstream', function(data) {
        self.parent._proxy('vantage-command-downstream', 'downstream', data).then(function(){
          if (data.completed === true) {
            if (self.parent._command) {

            //if (self.parent._command.command.indexOf('fail me yes') > -1) {
              //console.log('--------------A2.75-----------------');
              //console.log(util.inspect(self.parent._command, {showHidden: true, depth: null}));
            //}

              var res = self.parent._command.resolve;
              var rej = self.parent._command.reject;
              var cbk = self.parent._command.callback;
              delete self.parent._command;
              self.parent._command = void 0;
              self.parent._queueHandler.call(self.parent);

              if (cbk !== undefined) {
                cbk(data.error, data.data);
              } else if (data.error !== undefined && rej !== undefined) {
                console.log('sending reject: ')
                console.log(data.error)
                rej(data.error);
              } else if (res !== undefined) {
                res(data.data);
              }

              //if (rej !== undefined) { console.log('OMG CALLING REJ'); rej(data.error); }
              //if (res !== undefined) { res(data.error || data.data); }
              //if (cbk !== undefined) { cbk(data.error, data.data); }
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
          self.parent.events.emit('vantage-heartbeat-downstream');
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

        } else {
          self.parent._send('vantage-command-downstream', 'downstream', { completed: true, data: 'Exited successfully.' });
        }
      });

      self.io.on('vantage-resume-downstream', function(data) {
        self.parent._proxy('vantage-resume-downstream', 'downstream', data).then(function(){
          self.parent._prompt();
        });
      });

      var start = function() {
        self.parent._prompt();
      }

      self.parent.events.on('vantage-heartbeat-downstream', start);

      resolve();
      cb();
    });

    self.io.on('event', function(e){
      self.parent.log('event', e);
    });

    self.io.on('connect_timeout', function(e){
      self.parent.log('timeout', e);
    });

    var errorHandler = function(e) {

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

    self.io.on('connect_error', function(err) {
      return errorHandler(err);      
    });

    self.io.on('error', function(err){
      return errorHandler(err);
    });

    self.io.on('disconnect', function(data){

      self.parent.is('client', false);

      if (self.parent.is('server')) {

        self.parent._tempDelimiter(self.parent._origdelimiter);

        self.parent._send('vantage-heartbeat-downstream', 'downstream', {
          delimiter: self.parent._delimiter,
        });
      
      } else {

        // .. the process should end at this point...

        if (self.parent.is('local')) {

          self.parent._tempDelimiter(self.parent._origdelimiter);

          self.parent._prompt();
        }

      }

      delete self.io;

    });
  });

};
