
/**
 * Mock database API using vantage.js.
 * Used for README.md demo GIF.
 * This is the remote server that 
 * gets logged in to from the web server.
 */

/**
 * Module dependencies.
 */

var Vantage = require('./../../lib/vantage')
  , colors = require('colors')
  , _ = require('lodash')
  ;

/**
 * Variable declarations.
 */

var vantage
  , banner = 
     "\n###################################################################################################################\n" + 
     "#                                                                                                                 #\n" + 
     "#                                                  Node DB Server                                                 #\n" + 
     "#                                                                                                                 #\n" + 
     "###################################################################################################################\n"
  ;

// This starts up vantage: 
// - Gives it a banner on logon,
// - Sets the prompt delimiter,
// - Makes it listen on port 5001,
// - Shows the prompt on app startup.
vantage = Vantage()
 .banner(banner)
 .delimiter("node-dbsvr~$".white)
 .listen(process.argv[2] || 5001)
 .show();

// Creates the "SQL mode", where the
// user can execute arbitrary SQL. I 
// don't really connect to a database,
// as that would be a mouthful for a 
// demo. But in here, you would tie
// in to your app's database.
vantage
  .mode("sql", "Demo SQL mode.") 
  .init(function(args, cb){
    console.log("\n  Entering SQL Mode. You can now execute arbitrary SQL on your DB.\n  To exit, type `exit`.\n");
    cb();
  })
  .action(function(command, cb) {
    var str = "\n" + 
      "  first_name        last_name \n" + 
      "  ----------------  ---------------- \n" + 
      "  George            Clooney \n" + 
      "  George            Smith \n" + 
      "  George            Stevens \n";
    console.log(str);
    cb();
  });