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
    .option('-u, --user [user]', "Connect as a given user.")
    .option('-p, --pass [user]', "Password for given user.")
    .action(function(cmd, env) {
      cmdValue = cmd;
      envValue = env;
    });

  commander.parse(process.argv);

  if (typeof cmdValue === 'undefined' && 1 == 2) {
    self.log('\n  Please specify a server and a port.');
    self.log('\n  Example: vantage 192.168.0.1:3000.\n')
    process.exit(1);
  } else {

    if (envValue) {
      options.ssl = (envValue.ssl) ? true : void 0;
      options.user = (envValue.user) ? envValue.user : void 0;
      options.pass = (envValue.pass) ? envValue.pass : void 0;
    }

    var str = (!cmdValue) ? '' : cmdValue;

    if (str === 'tutorial') {
      var fs = require('fs');
      var path = require('path');
      var file = '/../examples/tutorial/tutorial.js';
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

    // If we aren't trying to go anywhere, 
    // just do a local instance.
    if (cmdValue === undefined) {
      vantage.show(); 
      return;
    }

    return new Vantage().connect(server, port, options).then(function(err, data) {
      if (err) {
        vantage.log(data);
        vantage._pause();
        process.exit(1);
      }
    }).catch(function(data){
      vantage.log(data);
      vantage._pause();
      process.exit(1);
    });
  }
