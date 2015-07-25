"use strict";

var chalk = require("chalk");

var debug = false
  , ctr = 1
  , max = 8
  , logs = {
      1: chalk.grey("loglogloglogloglogloglogloglogloglogloglogloglogloglogloglogloglogloglogloglog"),
      2: chalk.grey("loglogloglogloglogloglogloglogloglogloglogloglogloglogloglogloglogloglogloglog"),
      3: chalk.grey("loglogloglogloglogloglogloglogloglogloglogloglogloglogloglogloglogloglogloglog"),
      4: "",
      5: "  Notice how the logging doesn't interrupt the prompt? That's useful.",
      6: "",
      7: "  When you feel like it, type 'debug off'.",
      8: ""
    }
  ;

function logme(vtg) {
  var session = vtg;
  if (debug === true) {
    ctr++;
    if (ctr > max) { ctr = 1; }
    setTimeout(function(){
      if (debug === true) {
        session.log(logs[ctr]);
        logme(session);
      }
    }, Math.floor(Math.round(Math.random() * 1000) / 2));
  }
}

module.exports = function(vantage) {

  vantage
    .command("port")
    .description("Shows server port.")
    .action(function(args, cb){
      this.log(vantage.server._port);
      cb();
    });

  vantage
    .command("debug <state>")
    .description("Sets debug to 'on' or 'off'.")
    .action(function(args, cb){
      if (args.state === "on") {
        debug = true;
        logme(vantage);
      } else {
        debug = false;
      }
      cb();
    });
};

