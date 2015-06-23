
/**
 * Module dependencies.
 */

var _ = require('lodash')
  , intercept = require('./intercept')
  , Session = require('./session')
  , Firewall = require('./firewall')
  ;

/**
 * VantageServer prototype.
 */

var vantageServer = VantageServer.prototype;

/**
 * Expose `VantageServer`.
 */

exports = module.exports = VantageServer;

/**
 * Initialize a new `VantageServer` instance.
 *
 * @param {Vantage} parent
 * @return {VantageServer}
 * @api public
 */

function VantageServer(parent) {
  if (!(this instanceof VantageServer)) return new VantageServer;  
  this._hooked = false;

  // Sessions are created when you use 
  // vantage externally to remotely connect
  // to this running instance of vantage.
  // Every connection (a socket.io connection)
  // is stored as a Session object.
  this.sessions = [];

  this.parent = parent;
  return this;
};

/**
 * Gets vantage started as a server.
 * 
 * @param {App} app
 * @param {Object} options
 * @return {VantageServer}
 * @api public
 */

vantageServer.init = function(app, options, cb) {
  var self = this;

  // If options is a function, we think it's
  // a callback.
  cb = (_.isFunction(options)) ? options 
    : (cb || function(){});

  // If a port is passed in instead of options,
  // accept that by converting it to a filled object.
  // Otherwise, default to an empty object.
  options = (options && _.isFunction(options)) ? {} 
    : (options && !_.isObject(options) && !isNaN(options)) ? ({ port: options }) 
    : (!options) ? {} 
    : options;

  // If a port was passed as the 'app', assign it
  // as the port instead.
  options.port = 
    (app && !_.isObject(app) && !isNaN(app)) ? app : options.port;    

  // If only a port was passed as the app, make the app
  // object a blank function.
  app = 
    (app && !_.isObject(app) && !isNaN(app)) ? (function(){}) : app;

  var appIs = 
    (_.isFunction(app)) ? 'callback' :
    (_.isObject(app) && _.isFunction(app.callback)) ? 'koa' :
    '';

  options = _.defaults(options, { 
    port: 80,
    ssl: false,
    logActivity: false 
  });

  var appCallback = 
    (appIs == 'callback') ? app : 
    (appIs == 'koa') ? app.callback() : 
    void 0;

  if (!appCallback) {
    throw new Error('Unsupported HTTP Server passed into Vantage.'); return;
  }

  var type = (options.ssl) ? 'https' : 'http';
  if (type == 'http') {
    this.server = require(type).createServer(appCallback);
  } else {
    this.server = require(type).createServer(options, appCallback);
  }

  this.io = require('socket.io')(this.server);
  this.server.listen(options.port);
  this._port = options.port;
  this._logActivity = options.logActivity;

  this.io.set('authorization', function(handshakeData, accept){

    var address = handshakeData.connection._peername;
    var valid = self.firewall.valid(address);
    var query = handshakeData._query;
    var id = query.id || void 0;

    // If Vantage has the same unique ID, don't let
    // it connect to itself.
    if (id && parseFloat(id) === parseFloat(self.parent._id)) {
      return accept("You can't connect to yourself.", false);      
    }

    if (!valid) {
      return accept('IP Not Allowed: ' + address, false);
    } else {
      return accept(void 0, true);
    }

  });

  this.firewall = new Firewall();
  this.parent.firewall = this.firewall;

  this.listen(cb);

  return this;
};

/**
 * Creates server socket connections and 
 * registers all events.
 * 
 * @return {VantageServer}
 * @api private
 */

vantageServer.listen = function(cb) {
  var self =  this;
  cb = cb || function(){}

  this.io.on('connection', function(socket) {

    var session = new Session();
    session.io = socket;
    self.sessions.push(session);
    self.parent.is('server', true);

    session.io.on('vantage-keypress-upstream', function(data) {
      self.parent._proxy('vantage-keypress-upstream', 'upstream', data).then(function(){
        if ((['up', 'down', 'tab'].indexOf(data.key) > -1)) {
          var response = self.parent._getKeypressResult(data.key, data.value);
          self.parent._send('vantage-keypress-downstream', 'downstream', { value: response });
        } else {
          self.parent._histCtr = 0;
        }
      });
    });

    session.io.on('vantage-command-upstream', function(data) {
      self.parent._proxy('vantage-command-upstream', 'upstream', data).then(function() {
        if (data.command) {
          
          var execute = function() {
            return new Promise(function(resolve, reject){
              var cmd = {
                command: data.command,
                resolve: resolve,
                reject: reject,
                callback: function(resp) {
                  self.parent.emit('server_command_executed', {
                    command: data.command,
                    response: resp
                  });
                  self.parent._send('vantage-command-downstream', 'downstream', { command: data.command, completed: true, error: void 0, data: resp });
                },
              }
              self.parent._exec(cmd);
            });
          }

          self.parent.emit('server_command_received', {
            command: data.command
          });

          execute().then(function(resp) {
            self.parent.emit('server_command_executed', {
              command: data.command,
              response: resp
            });
            self.parent._send('vantage-command-downstream', 'downstream', { command: data.command, completed: true, error: void 0, data: resp });
          }).catch(function(error){
            self.parent.emit('server_command_error', {
              command: data.command,
              error: error
            });
            self.parent._send('vantage-command-downstream', 'downstream', { command: data.command, completed: true, error: error, data: void 0 });
          });
        }
      });
    }); 

    session.io.on('vantage-heartbeat-upstream', function(data) {
      self.parent._proxy('vantage-heartbeat-upstream', 'upstream', data).then(function() {
        self.parent._send('vantage-heartbeat-downstream', 'downstream', {
          delimiter: self.parent._delimiter,
        });
      });
    }); 

    // Upstream > Proxy > Downstream (Prompt User) > @Proxy > @Upstream (Use Data).
    session.io.on('vantage-prompt-upstream', function(data) {
      self.parent._proxy('vantage-prompt-upstream', 'upstream', data).then(function() {
        self.parent.emit('vantage-prompt-upstream', data);
      });
    }); 

    session.io.on('disconnect', function(data) {

      self.parent.emit('server_disconnect', data);

      var nw = [];

      for (var i = 0; i < self.sessions.length; ++i) {
        if (self.sessions[i].io.id == session.io.id) {
          delete self.sessions[i];
        } else {
          nw.push(self.sessions[i]);
        }
      }

      self.sessions = nw;
      self.unhook();

      if (self._logActivity) {
        self.parent.log('User exited session.');
      }

      if (self.sessions.length < 1) {
        self.parent.is('server', false);
      }
    });

    if (self._logActivity) {
      self.parent.log('\nUser entering session.')
    }

    self.hook(function(txt) {
      self.parent._send('vantage-stdout-downstream', 'downstream', { value: txt });
      return txt = '';
    });

    if (self.parent._banner) {
      session.io.emit('vantage-banner-downstream', {
        banner: self.parent._banner,
      });
    }

    session.io.emit('vantage-heartbeat-downstream', {
      delimiter: self.parent._delimiter,
    });

    self.parent.emit('server_connection', socket);
    cb(socket);
    
  }); 

  return this;
};

/**
 * Unhooks stdout capture.
 * 
 * @return {VantageServer}
 * @api public
 */

vantageServer.unhook = function() {
  if (this._hooked && this._unhook !== undefined && this.sessions.length < 1) {
    this._unhook();
    this._hooked = false;
    if (this._logActivity) {
      this.parent.log('Stdout returned to console.');
    }
  }
  return this;
},

/**
 * Hooks all stdout through a given function.
 * 
 * @param {Function} fn
 * @return {VantageServer}
 * @api public
 */

vantageServer.hook = function(fn) {
  if (this._hooked && this._unhook != undefined) {
    this.unhook();
  }
  if (this._logActivity) {
    this.parent.log('Piping stdout downstream.');
  }
  this._unhook = intercept(fn);
  this._hooked = true;
  return this;
};
