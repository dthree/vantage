#!/usr/bin/env node

"use strict";

var commander = require("commander")
  , Vantage = require("../lib/index")
  , chalk = require("chalk")
  ;

var command
  , options = {}
  ;

commander
  .arguments("[server]")
  .option("-s, --ssl", "Connect using SSL.")
  .option("-u, --user [user]", "Connect as a given user.")
  .option("-p, --pass [user]", "Password for given user.")
  .action(function(cmd, opts) {
    command = cmd || "";
    opts = opts || {};
    options.ssl = (opts.ssl) ? true : void 0;
    options.user = (opts.user) ? opts.user : void 0;
    options.pass = (opts.pass) ? opts.pass : void 0;
  });

commander.parse(process.argv);

function parseConnection(str) {
  var parts = String(str).split(":");
  var port = (parts.length === 2) ? parts[1] : void 0;
  var server = (parts.length === 2) ? parts[0] : void 0;
  if (parts.length === 1) {
    server = (isNumber(parts[0])) ? void 0 : parts[0];
    port = (String(parts[0]).length < 6 && isNumber(parts[0])) ? parts[0] : void 0;
  }
  server = (!server) ? "127.0.0.1" : server;
  port = (!port) ? "80" : port;
  return ({
    server: server,
    port: port
  });
}

function isNumber(str) {
  return !isNaN(parseInt(str));
}

function connect(vantage, server, port, opt) {
  return vantage.connect(server, port, opt).then(function(err) {
    if (err) {
      vantage._pause();
      process.exit(1);
    } else {
      if (!vantage.ui.midPrompt()) {
        vantage._prompt();
      }
    }
  }).catch(function(err){
    if (err.stack) {
      vantage.log(err.stack);
    }
    vantage._pause();
    process.exit(1);
  });
}

function showTour() {
  var fs = require("fs");
  var path = require("path");
  var file = "/../examples/tour/tour.js";
  if (fs.existsSync(path.join(__dirname, file))) {
    require(path.join(__dirname, file)); return;
  } else {
    console.log(chalk.yellow("\n  Looks like the tour isn't included in your Vantage instance.\n  Ensure ./examples/ is in your Vantage directory.\n"));
    process.exit(1);
  }
}

function execute(cmd, opt) {
  if (cmd === "tour") {
    return showTour();
  }

  var vantage = new Vantage();
  vantage.show();

  var connection = parseConnection(cmd);

  // If there is somewhere to go, connect.
  if (cmd !== undefined) {
    connect(vantage, connection.server, connection.port, opt);
  }
}

execute(command, options);
