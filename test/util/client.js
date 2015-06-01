var assert = require("assert")
  , should = require('should')
  , Vantage = require('../')
  , http = require('http')
  ;

var create = function(fn, port) {
	
	var vantage = new Vantage();

	vantage
		.delimiter(port + ':')
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

var a = create(handler, process.argv[2]);
//var b = create(handler, 3041);
//var c = create(handler, 3042);

console.log('ready')


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