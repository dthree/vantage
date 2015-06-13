#!/usr/bin/env node

var commander = require('commander'),
    Vantage = require('../lib/vantage')
    colors = require('colors')
  ;

  var cmdValue, envValue, script, options = {}, self = this;

  commander
    .version('0.0.1')
    .arguments('[server]')
    .option('-s, --ssl', "Connect using SSL.")
    .action(function(cmd, env){
      cmdValue = cmd;
      envValue = env;
    });

  commander.parse(process.argv);

  if (typeof cmdValue === 'undefined' && 1 == 2) {
    self.log('\n  Please specify a server and a port.');
    self.log('\n  Example: vantage 192.168.0.1:3000.\n')
    process.exit(1);
  } else {

    if (envValue && envValue.ssl === true) {
      options.ssl = true;
    }

    var str = (!cmdValue) ? '' : cmdValue;

    if (str === 'tutorial') {
      var fs = require('fs');
      var path = require('path');
      var file = '/../examples/tutorial/tutorial.js';
      console.log(__dirname + file);
      if (fs.existsSync(__dirname + file)) {
        require(__dirname + file); return;
      } else {
        console.log("\n  Looks like the tutorial isn't included in your Vantage instance.\n  Ensure ./examples/ is in your Vantage directory.\n".yellow);
        process.exit(1);
      }
    }

    var parts = String(str).split(':');

    var port = (parts.length == 2) ? parts[1] : void 0;
    var server = (parts.length == 2) ? parts[0] : void 0;

    if (parts.length == 1) {
      server = (String(parts[0]).split('.').length == 4) ? parts[0] : void 0;
      port = (String(parts[0]).length < 6 && !isNaN(parts[0])) ? parts[0] : void 0;
    }

    server = (!server) ? '127.0.0.1' : server;
    port = (!port) ? '80' : port;

    if (String(server).split('.').length !== 4 || isNaN(port)) {
      self.log('\n  Invalid server/port passed: ' + server + ':' + port + '\n');
      process.exit(1);
    }

    var vantage = new Vantage();

    return new Vantage().connect(server, port, options).then(function() {

    });
  }
