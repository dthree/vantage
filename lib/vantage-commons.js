/**
 * Function library for Vantage's out-of-the-box
 * API commands. Imported into a Vantage server
 * through vantage.use(module).
 */

/**
 * Module dependencies.
 */

var _ = require('lodash')
  ;

module.exports = function(vantage, options) {

  /**
   * Help for a particular command.
   */

  vantage
    .command("help [command]")
    .description("Provides help for a given command.")
    .action(function(args, cb) {
      if (args.command) {
        var name = _.findWhere(this.commands, { _name: String(args.command).toLowerCase().trim() });
        if (name) {
          this.log(name.helpInformation());  
        } else {
          this.log(this._commandHelp(args.command));
        }
      } else {
        this.log(this._commandHelp(args.command));
      }
      cb();
    });

  /**
   * Exits Vantage.
   */

  vantage
    .command('exit')
    .option("-f, --force", "Forces process kill without confirmation.")
    .description("Exists instance of Vantage.")
    .action(function(args, cb) {
      this.exit(args.options);
    });

  /**
   * Connects to another instance of Vantage.
   */

  vantage
    .command("vantage [server]")
    .option("-s, --ssl", "Connect using SSL.")
    .description("Connects to another instance of Node running Vantage.")
    .action(function(args, cb) {
      var self = this;
      var str = (!args.server) ? '' : args.server;
      var parts = String(str).split(':');
      var port = (parts.length == 2) ? parts[1] : void 0;
      var server = (parts.length == 2) ? parts[0] : void 0;
      if (parts.length == 1) {
        server = (String(parts[0]).split('.').length == 4) ? parts[0] : void 0;
        port = (String(parts[0]).length < 6 && !isNaN(parts[0])) ? parts[0] : void 0;
      }
      server = (!server) ? '127.0.0.1' : server;
      port = (!port) ? '80' : port;
      var options = {
        ssl: (args.options.ssl == true) ? true : false,
      }
      this.client.connect(server, port, options, function(err) {
        if (err) {
          //throw new Error(err);
        } else {
          self.log('Connected successfully.');
        }
        cb(err);
      });
    });

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
      }

      self.log(String("Installing " + options.module + " from the NPM registry:").white);

      this._use(options, function(err, data){
        if (err) {
          self.log(data);
        } else {
          var commands = (data || {}).registeredCommands;
          if (commands < 1) {
            self.log(String("No new commands were registered. Are you sure you " + options.module + " is a vantage extension?").yellow);
          } else {
            self.log(String("Successfully registered " + commands + " new command" + ((commands > 1) ? "s" : "") + ".").white);
          }
        }
        cb();
      });
    });

}

