
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
  , banner = 'Welcome to the standalone Vantage server.'
  , port = process.argv[2] || 5000
  , delimiter = String('svr:' + port + '~$').white
  , server
  ;

server = Vantage()
 .banner(banner)
 .delimiter(delimiter)
 .listen(port)
 .show();

server
  .mode('repl', 'Enters REPL mode.')
  //.delimiter('repl!:')
  //.init(function(args, cb){
    //console.log('Entered REPL Mode:')
    //cb();
  //})
  .action(function(command, cb) {
    try {
      var res = eval(command);
      var log = (_.isString(res)) ? String(res).white : res;
      console.log(res);
    } catch(e) {
      console.log(e)
    }
    cb();
  });


module.exports.nodeIs = function(amt) {
  amt = amt || 10;
  for (var i = 0; i < amt; ++i) {
    console.log('Totally awesome!'.white);
  }
  return 'Totally awesome!'.white;
}

//  var cat; for (var i = 0; i < 10; ++i) { cat += "Node is awesome\n" }