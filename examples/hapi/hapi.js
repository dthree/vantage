
/**
 * Example of a Vantage server that hooks into
 * a Hapi server.
 *
 * To run, ensure you have devDependencies 
 * with `npm install`.
 */

/**
 * Module dependencies.
 */

var Vantage = require('./../../lib/index')
  , Hapi = require('hapi')
  , server = new Hapi.Server()
  ;

/**
 * Variable declarations.
 */

var vantage
  , delimiter = 'hapisvr:5000~$'
  , port = 5000
  ;

/**
 * Firing up a Vantage server.
 */

vantage = Vantage()
 .delimiter(delimiter)
 .listen(server, port)
 .show();

server.route({
	method: 'GET',
	path: '/hello-world',
	handler: function(req, reply) {
		reply('Hello world.');
	}
});

server.start();