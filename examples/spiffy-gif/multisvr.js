/**
 * Module dependencies.
 */

var Vantage = require('./../../lib/vantage')
  , chalk = require("chalk")
  , _ = require("lodash")
  ;

/**
 * Variable declarations.
 */

var port = 6000
  , instances = []
  , ports = {}
  ;

for (var i = 0; i < 10; ++i) {
  var vantage = new Vantage();

  vantage
    .delimiter(chalk.white("svr:" + port + "~$"))
    .listen(port);

  (function(curr){
    vantage
      .command("show <port>")
      .action(function(args, cb){
        if (ports[args.port]) {
          ports[args.port].show();
        }
        cb();
      });
  })(port);

  instances.push(vantage);
  ports[port] = vantage;

  port++;
}

