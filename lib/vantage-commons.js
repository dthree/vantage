  var _ = require('lodash')
    ;

  var help = {
    command: 'help [command]',
    description: 'Provides help for a given command.',
    action: function(args, cb){
      if (args.command) {
        var name = _.findWhere(this.commands, { _name: String(args.command).toLowerCase().trim() });
        if (name) {
          this.log(name.helpInformation());  
        } else {
          this.log(this.commandHelp(args.command));
        }
      } else {
        this.log(this.commandHelp(args.command));
      }
      cb();
    },
  }

  var exit = {
    command: 'exit',
    options: [
      ["-f, --force", "Forces process kill without confirmation."],
    ],
    description: 'Exists instance of Vantage.',
    action: function(args, cb) {
      this.exit(args.options);
    },
  }
  
  var is = {
    command:'is [state]',
    description: 'state of server',
    action: function(args, cb) {
      this.log(this.is(args.state));
      cb();
    },
  }

  var vtg = {
    command:'vtg [prop]',
    description: 'Access raw properties',
    action: function(args, cb) {
      this.log(this[args.prop]);
      cb();
    },
  }

  var vantagex = {
    command: 'vantage [server]',
    options: [
      ['-s, --ssl', "Connect using SSL."]
    ],
    description: 'Connects to another instance of Node running Vantage.',
    action: function(args, cb) {

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

      this.client.connect(server, port, options, function(){
        self.log('Connected successfully.');
      });
    },
  }
  

  module.exports = [help, exit, vantagex, is, vtg];
