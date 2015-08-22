"use strict";

/**
 * Function library for Vantage"s out-of-the-box
 * API commands. Imported into a Vantage server
 * through vantage.use(module).
 */

/**
 * Module dependencies.
 */

var _ = require("lodash");

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

};

