/**
 * Basic authentication extension.
  */

/**
 * Module dependencies.
 */

var _ = require('lodash')
  ;

module.exports = function(vantage, options) {

  var users
    ;

  options = options || {}
  options = _.defaults(options, {
    users: [],
    deny: void 0,
    unlockTime: void 0,
  });

  if (options.users.length < 1) {
    throw new Error("Vantage basic authentication cannot be called without passing in at least one user into the options parameter.");
  }

  users = options.users.map(function(cred){
    var user = cred.user || cred.username
      , pass = cred.pass || cred.password || cred.secret
      ;
    if (!user) {
      throw new Error("Vantage basic authentication: no 'user' string was passed in a submitted user: " + JSON.stringify(cred));
    }
    if (!pass) {
      throw new Error("Vantage basic authentication: no 'pass' string was passed in a submitted user: " + JSON.stringify(cred));
    }
    return ({
      user: user,
      pass: pass
    });
  });

  var connections = {}

  var strategy = function(args, callback) {

    console.log(args);

    var self = this
      , deny = (options.deny || 3)
      , unlockTime = (options.unlockTime || 30000)
      , retry = (options.retry || 3)
      , retryTime = (options.retryTime || 1000)
      , handshake = (args.handshake)
      , host = ((handshake) ? handshake.host : void 0)
      , port = ((handshake) ? handshake.port : void 0)
      , id = host + ":" + port
      ;

    //callback("good", true);

    if (!handshake) {
      callback("Access denied: no connection handshake.", false);
      return;
    }

    if (!host) {
      callback("Access denied: no host specified in connection handshake.", false);
      return;
    }

    connections[id] = connections[id] || {
      attempts: 0,
      deny: 0
    }

    var questions = [{
      type: "input",
      name: "answer",
      message: "login as:".white
    }, {
      type: "password",
      name: "answer",
      message: "password:".white
    }];

    var state = {
      user: args.user || void 0,
      pass: args.pass || void 0
    }

    attempt();

    // Authentication attempt logic,
    // including adding up retry and 
    // deny counts, etc.
    function attempt() {
      connections[id].attempts++;
      if (connections[id].attempts > retry) {
        connections[id].attempts = 0;
        connections[id].deny++;
        callback("Access denied: too many attempts.", false);
        return;
      } 
      if (connections[id].deny >= deny && unlockTime > 0) {
        setTimeout(function(){
          connections[id].deny = 0;
        }, unlockTime)
        connections[id].attempts = 0;
        callback("Account locked out: too many login attempts.", false);
        return;
      }
      gather(function(user, pass){
        var user = search(user, pass, users);
        if (user) {
          connections[id].attempts = 0;
          connections[id].deny = 0;
          callback("Successfully Authenticated.", true);
        } else {
          state.pass = void 0;
          setTimeout(function(){
            if (connections[id].attempts <= retry) {
              console.log("Access denied.")
            }
            attempt();
          }, retryTime);
        }
      });
    }

    // Check if submitted user matches anything.
    function search(user, pass, users) {
      return _.findWhere(users, { user: user, pass: pass });
    }

    // Ask for a user and password.
    // If a user is passed in, just ask for 
    // a password and skip the user.
    function gather(cbk) {
      ask(questions[0], function(user) {
        state.user = user;
        ask(questions[1], function(pass){
          state.pass = pass;
          cbk(state.user, state.pass);
        }, state.pass);
      }, state.user);
    }

    // If a value is given, skip, otherwise
    // prompt user for data.
    function ask(question, cbk, skip) {
      if (skip) {
        cbk(skip);
        return;
      }
      self.prompt(question, function(answ) {
        if (String(answ.answer).trim() == "") {
          return ask(question, cbk);
        } else {
          cbk(answ.answer);
        }
      })
    }

  }

  return strategy;

}

