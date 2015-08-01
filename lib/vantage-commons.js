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
  , util = require("./util")
  , chalk = require("chalk")
  ;

module.exports = function(vantage) {

  /**
   * Help for a particular command.
   */

  vantage
    .command("help [command]")
    .description("Provides help for a given command.")
    .action(function(args, cb) {

      if (args.command) {
        var name = _.findWhere(this.parent.commands, { _name: String(args.command).toLowerCase().trim() });
        if (name && !name._hidden) {
          this.log(name.helpInformation());
        } else {
          this.log(this.parent._commandHelp(args.command));
        }
      } else {
        this.log(this.parent._commandHelp(args.command));
      }
      cb();
    });

  /**
   * Exits Vantage.
   */

  vantage
    .command("exit")
    .option("-f, --force", "Forces process kill without confirmation.")
    .description("Exits instance of Vantage.")
    .action(function(args) {
      args.options = args.options || {};
      args.options.sessionId = this.id;
      this.parent.exit(args.options);
    });

  /**
   * Lists out active sessions.
   */

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
          + util.pad(ssn.user + "@" + (ssn.address || "local"), 20)
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

  /**
   * Imports node module in realtime.
   */

  vantage
    .command("use <module>")
    .description("Installs a vantage extension in realtime.")
    .option("-l, --loglevel", "Sets log level of module install")
    .action(function(args, cb) {
      var self = this;
      var options = {
        loglevel: args.options.loglevel || "error",
        module: args.module
      };
      self.log(chalk.white("Installing " + options.module + " from the NPM registry:"));
      this.parent._use(options, function(err, data) {
        if (err) {
          self.log(data);
        } else {
          var commands = (data || {}).registeredCommands;
          if (commands < 1) {
            self.log(chalk.yellow("No new commands were registered. Are you sure you " + options.module + " is a vantage extension?"));
          } else {
            self.log(chalk.white("Successfully registered " + commands + " new command" + ((commands > 1) ? "s" : "") + "."));
          }
        }
        cb();
      });
    });
};

