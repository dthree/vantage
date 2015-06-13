
/**
 * Example of a Vantage server with a built-in
 * firewall for basic access control.
 */

/**
 * Module dependencies.
 */

var Vantage = require('./../../lib/vantage')
  ;

/**
 * Variable declarations.
 */

var vantage
  , delimiter = 'svr:5000~$'
  , port = 5000
  , server
  ;

/**
 * Firing up a Vantage server.
 */

server = Vantage()
 .delimiter(delimiter)
 .listen(port)
 .show();

server.firewall
  .policy('REJECT')
  .accept('192.168.0.0/16')
  .reject('10.40.50.24/32')
  .accept('10.0.0.0/8');

