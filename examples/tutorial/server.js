var assert = require("assert")
  , should = require('should')
  , colors = require('colors')
  , Vantage = require('./../../lib/vantage')
  , http = require('http')
  ;

var create = function(port, ssl) {

  var debug = false;
  var ctr = 1, max = 11;

  if (!port) {
    console.error('Bad Arguments', port, ssl);
    process.exit(1);
  }

  var vantage = Vantage();

  var logs = {
    1: 'lotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogs'.grey,
    2: 'lotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogs'.grey,
    3: 'lotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogs'.grey,
    4: '',
    5: '  Woah - Lots of logging!',
    6: "  Notice how the logging doesn't interrupt the prompt? That's useful.",
    4: '',
    7: "  When you feel like it, type 'debug off'.",
    8: '',
    9: 'lotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogs'.grey,
    10: 'lotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogs'.grey,
    11: 'lotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogslotsoflogs'.grey,
  }
  
  // Simulated random logging :)
  var logme = function() {
    if (debug === true) {
      ctr++;
      if (ctr > max) { ctr = 1 }
      setTimeout(function(){
        vantage.log(logs[ctr]);
        logme();
      }, Math.floor(Math.round(Math.random()*1000)/2))
    }
  }

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
        logme();        
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
    .listen(port)
    .show()
    ;

  return vantage;
} 

var svr = create(process.argv[2], process.argv[3]);

