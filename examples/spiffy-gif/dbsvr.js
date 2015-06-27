
/**
 * Mock database using vantage.js.
 * Used for README.md GIF.
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
  , banner
  , port = process.argv[2] || 5001
  , delimiter = String('node-dbsvr~$').white
  , server
  , debug = false
  ;

banner = 
 "\n###################################################################################################################\n" + 
 "#                                                                                                                 #\n" + 
 "#                                                  Node DB Server                                                 #\n" + 
 "#                                                                                                                 #\n" + 
 "###################################################################################################################\n";

server = Vantage()
 .banner(banner)
 .delimiter(delimiter)
 .listen(port)
 .show();

server
  .mode('sql', 'Demo SQL mode.') 
  .init(function(args, cb){
    console.log("\n  Entering SQL Mode. You can now execute arbitrary SQL on your DB.\n  To exit, type `exit`.\n");
    cb();
  })
  .action(function(command, cb) {
    var str = 
      "\n  first_name        last_name\n" + 
      "  ----------------  ----------------\n" + 
      "  George            Clooney\n" + 
      "  George            Smith\n" + 
      "  George            Stevens\n";
    console.log(str);
    cb();
  });
