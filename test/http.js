var assert = require("assert")
  , should = require('should')
  , vantage1 = require('../')
  , vantage2 = require('../')
  , vantage3 = require('../')
  , http = require('http')
  ;

var create = function(fn, port, vantage) {
	
	//var svr = http.createServer(fn).listen(port);
	//svr._port = port;
	//svr._vantage = vantage;

	vantage
		.listen(function(req, res) { }, {
			port: port,
		});

	vantage
		.command('foo <something>')
		.action(function(args, cb){
			console.log('You have are a foo ' + args.something);
			cb();
		});

	return vantage;
}

var handler = function(req, res) {
	console.log(this._port);
	res.write('hi hi hi');
	res.end();
}

create(handler, 3040, vantage1);
create(handler, 3041, vantage2);
create(handler, 3042, vantage3);



/*
describe('vantage', function(){
  
  describe('constructor', function(){

  	it('should exist and be an object', function(){
	    should.exist(vantage);
	    vantage.should.be.type('object');
  	});

  });

});

*/