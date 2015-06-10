var assert = require("assert")
  , should = require('should')
  , colors = require('colors')
  , Vantage = require('../../')
  , http = require('http')
  ;

var create = function(port, ssl) {

  var debug = false;
  var ctr = 1, max = 11;
  
  var logs = {
    1: 'foobarlogfoobarlogfoobarlogfoobarlogfoobarlogfoobarloglogfoobarlogfoobarlogfoobarlog',
    2: 'foobarlogfoobarlogfoobarlogfoobarlogfoobarlogfoobarloglogfoobarlogfoobarlogfoobarlog',
    3: 'foobarlogfoobarlogfoobarlogfoobarlogfoobarlogfoobarloglogfoobarlogfoobarlogfoobarlog',
    4: '',
    5: '  Woah - Crazy Logging!!!',
    6: "  Notice how the logging doesn't interrupt the prompt? That's useful.",
    4: '',
    7: "  When you feel like it, type 'debug off'.",
    8: '',
    9: 'foobarlogfoobarlogfoobarlogfoobarlogfoobarlogfoobarloglogfoobarlogfoobarlogfoobarlog',
    10: 'foobarlogfoobarlogfoobarlogfoobarlogfoobarlogfoobarloglogfoobarlogfoobarlogfoobarlog',
    11: 'foobarlogfoobarlogfoobarlogfoobarlogfoobarlogfoobarloglogfoobarlogfoobarlogfoobarlog',
  }

  var vantage = Vantage();
  
  setInterval(function() {
    if (debug === true) {
      ctr++;
      if (ctr > max) { ctr = 1 }
      vantage.log(logs[ctr]);
    }
  }, 400);
  

  vantage
    .command('port')
    .description('Shows server port.')
    .action(function(args, cb){
      var slf = this;
      vantage.log(slf.server._port);
      cb();
    });

  vantage
    .command('debug <state>')
    .description("Sets debug to 'on' or 'off'.")
    .action(function(args, cb){
      if (args.state == 'on') {
        debug = true;
      } else {
        debug = false;
      }
      cb();
    });

  vantage
    .command('port')
    .description('Shows server port.')
    .action(function(args, cb){
      var slf = this;
      vantage.log(slf.server._port);
      cb();
    });
    
  var welcome = 'Welcome to the Tutorial Server on port ' + port + '!';

  vantage
    .delimiter('tutorialsvr:' + port + '~$')
    .banner(welcome)
    .listen(port);

  return vantage;
}

var svr = create(process.argv[2], process.argv[3]);

