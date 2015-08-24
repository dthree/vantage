"use strict";

/**
 * Function library for Vantage"s out-of-the-box
 * API commands. Imported into a Vantage server
 * through vantage.use(module).
 */

/**
 * Module dependencies.
 */

var _ = require("lodash")
  , chalk = require("chalk")
  ;

module.exports = function(vantage) {

  vantage
    .command("who", "Lists active vantage sessions.")
    .hidden()
    .action(function(args, cb) {
      var ssns = _.clone(this.parent.server.sessions || []);
      ssns.unshift(this.parent.session);
      var hdr = "  ID    User                 ";
      this.log("\n" + hdr);
      for (var i = 0; i < ssns.length; ++i) {
        var ssn = ssns[i];
        var id = ssn.id.slice(ssn.id.length - 4, ssn.id.length);
        var res = ""
          + "  "
          + id
          + "  "
          + vantage.util.pad(ssn.user + "@" + (ssn.address || "local"), 20)
          + ""
          ;
        res = (ssn.id === this.id) ? chalk.white(res) : res;
        this.log(res);
      }
      this.log(" ");
      cb();
    });

  /**
   * Connects to another instance of Vantage.
   */

  vantage
    .command("vantage <server>")
    .alias("vtg")
    .alias("nsh")
    .option("-s, --ssl", "Connect using SSL.")
    .option("-u, --user [user]", "Connect as a given user.")
    .option("-p, --pass [user]", "Password for given user.")
    .description("Connects to another instance of Node running Vantage.")
    .autocompletion(function(text, iteration, cb){
      cb(void 0, "vantage 127.0.0.1:80");
    })
    .action(function(args, cb) {
      var self = this;
      var str = (!args.server) ? "" : args.server;
      var parts = String(str).split(":");
      var port = (parts.length === 2) ? parts[1] : void 0;
      var server = (parts.length === 2) ? parts[0] : void 0;
      if (parts.length === 1) {
        server = (String(parts[0]).split(".").length === 4) ? parts[0] : void 0;
        port = (String(parts[0]).length < 6 && !isNaN(parts[0])) ? parts[0] : void 0;
      }
      server = (!server) ? "127.0.0.1" : server;
      port = (!port) ? "80" : port;
      var options = {
        ssl: (args.options.ssl === true) ? true : false,
        user: (args.options.user) ? args.options.user : void 0,
        pass: (args.options.pass) ? args.options.pass : void 0,
        sessionId: self.id
      };
      this.parent.client.connect(server, port, options, function(err, data) {
        cb(err, data);
      });
    });
    //..after;

};

