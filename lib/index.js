
"use strict";

/**
 * Module dependencies.
 */

var _ = require("lodash");
var Vorpal = require('vorpal');
var VantageServer = require("./server");
var VantageClient = require("./client");
var commons = require("./vantage-commons");
var repl = require("vorpal-repl");

function Vantage() {

  var self = this;

  if (!(this instanceof Vantage)) { return new Vantage(); }

  Vorpal.call(this);

  // Banner to display on login to a system. If null,
  // doesn't display a banner.
  this._banner = void 0;

  // Vantage client connects to other instances
  // of Vantage.
  this.client = new VantageClient(this);

  // Vantage server receives connections from
  // other vantages. Activated by vantage.listen();
  this.server = new VantageServer(this);

  // If authentication is used, it is called through this fn.
  this._authFn = void 0;

  this._initIO();

  return this;
}

Vantage.prototype = Object.create(Vorpal.prototype);

/**
 * Vantage prototype.
 */

var vantage = Vantage.prototype;

_.extend(Vantage.prototype, {

  _initIO: function() {
    this
      .use(commons)
      .use(repl);
  },

  /**
   * Programatically connect to another server
   * instance running Vantage.
   *
   * @param {Server} server
   * @param {Integer} port
   * @param {Object} options
   * @param {Function} cb
   * @return {Promise}
   * @api public
   */

  connect: function(server, port, options, cb) {
    return this.client.connect.call(this.client, server, port, options, cb);
  },

  /**
   * Write a banner on remote login.
   *
   * @param {String} banner
   * @return {Vantage}
   * @api public
   */

  banner: function(banner) {
    this._banner = banner || void 0;
    return this;
  },

  /**
   * Imports an authentication middleware
   * module to replace the server's auth
   * function, which is called when a remote
   * instance of vantage connects.
   *
   * @param {Function} middleware
   * @param {Object} options
   * @return {Vantage}
   * @api public
   */

  auth: function(middleware, options) {
    if (this.server && this.server.auth) {
      this.server.auth(middleware, options);
    } else {
      throw new Error("vantage.auth is only available in Vantage.IO. Please use this (npm install vantage-io --save)");
    }
    return this;
  },

  /**
   * Calls authentication middleware
   *
   * @param {Object} args
   * @param {Function} cb
   * @api private
   */

  _authenticate: function(args, cb) {
    var ssn = this.getSessionById(args.sessionId);
    if (!this._authFn) {
      var nodeEnv = process.env.NODE_ENV || "development";
      if (nodeEnv !== "development") {
        var msg = "The Node server you are connecting to appears "
        + "to be a production server, and yet its Vantage.js "
        + "instance does not support any means of authentication. \n"
        + "To connect to this server without authentication, "
        + "ensure its 'NODE_ENV' environmental variable is set "
        + "to 'development' (it is currently '" + nodeEnv + "').";
        ssn.log(chalk.yellow(msg));
        ssn.authenticating = false;
        ssn.authenticated = false;
        cb(msg, false);
      } else {
        ssn.authenticating = false;
        ssn.authenticated = true;
        cb(void 0, true);
      }
    } else {
      this._authFn.call(ssn, args, function(message, authenticated) {
        ssn.authenticating = false;
        ssn.authenticated = authenticated;
        if (authenticated === true) {
          cb(void 0, true);
        } else {
          cb(message);
        }
      });
    }
  },

  /**
   * Starts vantage listening as a server.
   *
   * @param {Mixed} app
   * @param {Object} options
   * @return {Vantage}
   * @api public
   */

  listen: function(app, options, cb) {
    this.server.init(app, options, cb);
    return this;
  }


})

/**
 * Expose `Vantage`.
 */

exports = module.exports = Vantage;