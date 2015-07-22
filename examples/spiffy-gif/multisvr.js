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

  vantage
    .command("port")
    .action(function(args, cb){
      this.log(this.parent.server._port);
      cb();
    });

  vantage
    .command("throw error")
    .action(function(args, cb){
      throw new Error("I am shamelessly erroring because you told me to.");
      cb();
    });

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

ports[6001].auth("basic", {
  users: [
    { user: "user", pass: "Qwer234" }
  ],
  deny: 3,
  unlockTime: 60000,
  retry: 3,
  retryTime: 500,
});

ports[6009].show();

/*
ports[6009].exec("port").then(function(data){
  this.log("executed port", data);
}).catch(function(err){
  this.log("got back port error", err);
})
*/

/*

ports[6009].exec("throw error").then(function(data){
  ports[6009].log("threw error", data);
}).catch(function(err, data){
  //console.log(err.stack)
  ports[6009].log("throw error catch", err, data);
})

*/



