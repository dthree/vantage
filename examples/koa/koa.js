
/**
 * Example of a Vantage server that hooks into.
 * a Koa server.
 *
 * To run, ensure you have devDependencies 
 * with `npm install`.
 */

/**
 * Module dependencies.
 */

var Vantage = require('./../../lib/vantage')
  , koa = require('koa')
  , app = koa()
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
 .listen(app, port)
 .show();
