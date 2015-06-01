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

      self.parent.is('client', true);

      self.io.on('vantage-keypress-downstream', function(data) {
        self.parent._pipe('vantage-keypress-downstream', 'downstream', data).then(function(){
          if (data.value !== undefined) {
            self.parent.redraw(self.parent._activePrompt, data.value);
          }
        });
      });

      self.io.on('vantage-command-downstream', function(data) {
        self.parent._pipe('vantage-command-downstream', 'downstream', data).then(function(){
          if (data.completed === true) {
            
            if (self.parent._command && _.isFunction(self.parent._command.callback)) {
              self.parent._command.callback.call(self.parent, data)
            }

            self.parent._prompt();
          }
        });
      });

      self.io.on('vantage-stdout-downstream', function(data) {
        self.parent._pipe('vantage-stdout-downstream', 'downstream', data).then(function(){
          var stdout = data.value || '';
          stdout = 
            (util.inspect(stdout.slice(stdout.length-2, stdout.length).trim() == '\n'))
            ? stdout.slice(0, stdout.length-1) 
            : stdout;
          self.parent.log(stdout);
        });
      });

      self.io.on('vantage-heartbeat-downstream', function(data){
        self.parent._pipe('vantage-heartbeat-downstream', 'downstream', data).then(function(){
          if (data.delimiter) {
            self.parent._tempDelimiter(data.delimiter);
          }
          self.parent.events.emit('vantage-heartbeat-downstream');
        });
      });

      self.io.on('vantage-prompt-downstream', function(data){
        self.parent._pipe('vantage-prompt-downstream', 'downstream', data).then(function(){
          // Set local prompt delimiter to question 
          // from upstream prompt command.
          self.parent._tempDelimiter(data.options.message);
          self.parent.inquirer.prompt(data.options, function(result){
            // Reset local prompt delimiter.
            self.parent._tempDelimiter(self.parent._origdelimiter);
            // Pipe prompt response back upstream so command
            // execution can continue.
            self.parent.send('vantage-prompt-upstream', 'upstream', { value: result });
          });
        });
      });

      self.io.on('vantage-close-downstream', function(data){
        self.io.close();
      });

      self.io.on('vantage-resume-downstream', function(data) {
        self.parent._pipe('vantage-resume-downstream', 'downstream', data).then(function(){
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

    self.io.on('connect_error', function(e){
      
      var description = (e.description == 503) ? '503 Service Unavailable' : e.description;
      
      self.parent.log('Error connecting: '.yellow + description);

      if (self.parent.is('terminable')) {
        process.exit(1);
      } else {

        self.io.close();
        //self.parent._debug('Prompt...!!')
        self.parent._prompt();
      }

      reject('Error connecting: ' + description);
      cb(true, 'Error connecting: ' + description);
    });

    self.io.on('error', function(e){
      self.parent.log('error', e);
    });

    self.io.on('disconnect', function(data){

      self.parent.is('client', false);

      if (self.parent.is('server')) {

        self.parent._tempDelimiter(self.parent._origdelimiter);

        self.parent.send('vantage-heartbeat-downstream', 'downstream', {
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
