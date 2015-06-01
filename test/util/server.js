var assert = require("assert")
  , should = require('should')
  , Vantage = require('../../')
  , http = require('http')
  ;

var create = function(fn, port, ssl) {
  
  var vantage = new Vantage();

  vantage
    .command('foo')
    .description('Should return "bar".')
    .action(function(args, cb){
      return new Promise(function(resolve, reject){
        console.log('bar');
        resolve();
      });
    });

  vantage
    .command('fuzzy')
    .description('Should return "wuzzy".')
    .action(function(args, cb){
      return new Promise(function(resolve, reject){
        console.log('wuzzy');
        resolve();
      });
    });

  vantage
    .delimiter(port + ':')
    .listen(function(req, res) { }, {
      port: port,
      ssl: ssl
    });


  return vantage;
}

var handler = function(req, res) {
  console.log(this._port);
  res.write('');
  res.end();
}

var svr = create(handler, process.argv[2], process.argv[3]);

