
/**
 * Mock web server using vantage.js.
 * Used for README.md demo GIF.
 * This is the server that is started
 * at the beginning of the GIF.
 */

/**
 * Module dependencies.
 */

var Vantage = require('./../../lib/index')
  , chalk = require('chalk')
  , repl = require('vantage-repl')
  , _ = require('lodash')
  ;

/**
 * Variable declarations.
 */

var vantage
  , debug = false
  , banner =
     "\n###################################################################################################################\n" +
     "#                                                                                                                 #\n" +
     "#                                                  Node Web Server                                                #\n" +
     "#                                                                                                                 #\n" +
     "###################################################################################################################\n"
  ;

// This starts up vantage:
// - Gives it a banner on logon,
// - Sets the prompt delimiter,
// - Makes it listen on port 5000,
// - Imports the REPL npm module,
// - Shows the prompt on app startup.
vantage = Vantage()
 .banner(banner)
 .delimiter(chalk.white("node-websvr~$"))
 .listen(process.argv[2] || 5000)
 .use(repl)
 .show();

// This registers the `debug` command seen
// in the demo. No, it's not real logging
// for the sake of brevity, but you would
// just tie this in to your app's logging
// logic.
vantage
  .command("debug <domain>", "Demo debug mode.")
  .action(function(args, cb) {
    var self = this
      , verbs = ["GET", "PUT", "POST", "PATCH", "DELETE"]
      , routes = ["/", "/client/record/", "/group/report/pdf/", "/marketing/ftp/files/", "/office/log/"]
      , rand
      , time
      , str
      ;

    // This isn't important - just makes
    // random logging - you aren't going to
    // use this.
    debug = (args.domain == "off") ? false : debug;
    if (args.domain == "web") {
      this.log('\nShowing all logging for web requests:\n')
      debug = true;
      function go() {
        setTimeout(function(){
          rand = Math.round(Math.random()*5);
          rand = (rand > 4) ? 4 : (rand < 0) ? 0 : rand;
          time = Math.round(Math.random()*200);
          time = (time < 60) ? chalk.green(time)
            : (time < 200) ? chalk.yellow(time)
            : chalk.red(time);
          str = chalk.white(verbs[rand])
            + " " + String(routes[rand]) + Math.round(Math.random()*100000)
            + " (" + time + chalk.white("ms") + ")";
          if (debug == true) {
            self.log(str);
            go();
          }
        }, Math.round(Math.random()*500));
      }
      go();
    }
    cb();
  });


// These are global functions used by the
// REPL module in the demo:
// repl: app.requests
// 87
// repl: nodeIs();
// ... Awesome.
global.app = {
  requests: 87,
}

global.nodeIs = function() {
  setTimeout(function(){ console.log(chalk.white("\n\n  Really,")) }, 1);
  setTimeout(function(){ console.log(chalk.white("    Really,")) }, 300);
  setTimeout(function(){ console.log(chalk.white("      Really,")) }, 600);
  setTimeout(function(){ console.log(chalk.cyan("        Awesome.\n")) }, 900);
  return '';
}
