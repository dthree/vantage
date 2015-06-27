
/**
 * Mock web server using vantage.js.
 * Used for README.md GIF.
 */

/**
 * Module dependencies.
 */

var Vantage = require('./../../lib/vantage')
  , colors = require('colors')
  , _ = require('lodash')
  , repl = require('vantage-repl')
  ;

/**
 * Variable declarations.
 */

var vantage
  , banner
  , port = process.argv[2] || 5000
  , delimiter = String('node-websvr~$').white
  , server
  , debug = false
  ;

banner = 
 "\n###################################################################################################################\n" + 
 "#                                                                                                                 #\n" + 
 "#                                                  Node Web Server                                                #\n" + 
 "#                                                                                                                 #\n" + 
 "###################################################################################################################\n";

server = Vantage()
 .banner(banner)
 .delimiter(delimiter)
 .listen(port)
 .use(repl)
 .show();

server
  .command('debug <domain>', 'Demo debug mode.') 
  .action(function(args, cb) {
    var self = this;
    if (args.domain == "off") {
      debug = false; 
      cb();
      return;
    }
    if (args.domain == "web") {
      console.log('\nShowing all logging for web requests:\n')
      debug = true;
      var verbs = ["GET", "PUT", "POST", "PATCH", "DELETE"];
      var routes = ["/", "/client/record/", "/group/report/pdf/", "/marketing/ftp/files/", "/office/log/"];
      var go = function() {
        if (debug == true) {
          setTimeout(function(){
            var rand = Math.round(Math.random()*5);
            rand = (rand > 4) ? 4 : (rand < 0) ? 0 : rand;
            var time = Math.round(Math.random()*200);
            time = (time < 60) ? String(time).green
              : (time < 200) ? String(time).yellow
              : String(time).red;
            var str = String(verbs[rand]).white
              + " " + String(routes[rand]) + Math.round(Math.random()*100000)
              + " (" + time + "ms".white + ")";
            if (debug == true) {
              self.log(str);
              go();
            }
          }, Math.round(Math.random()*500));
        }
      }
      go();
      cb();
    } else {
      cb();
    }

  });

global.app = {
  requests: 87,
}

global.nodeIs = function() {
  setTimeout(function(){ console.log("\n\n  Really,".white) }, 1);
  setTimeout(function(){ console.log("    Really,".white) }, 300);
  setTimeout(function(){ console.log("      Really,".white) }, 600);
  setTimeout(function(){ console.log("        Awesome.\n".cyan) }, 900);
  return '';
}
