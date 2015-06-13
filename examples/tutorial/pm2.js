var pm2 = require('pm2')
  , _ = require('lodash')
  ;

module.exports = {

  spawn: function(options, cb) {

    options = options || {}

    options = _.defaults(options, {
      ports: [],
      ssl: false,
    });

    pm2.connect(function() {

      var ports = options.ports;

      var done = 0;
      var handler = function(err, cb) {
        done++;
        if (done == ports.length) {
          cb(err);
        };
      }

      var start = function(cb) {
        for (var i = 0; i < ports.length; ++i) {
          (function(port){
            pm2.start({
              script: __dirname + '/server.js',
              cluster: false,
              args: [port, false],
              instances: 1,
              //error_file: './server.stderr.log',
            }, function(err, apps) {
              if (err) {
                console.error(err)
              }
              handler(err, cb);
            });
          })(ports[i]);
        }
      }

      var kill = function(cb){
        pm2.delete('all', cb);
      }

      kill(function() {
        start(function() {
          pm2.disconnect();
          cb();
        });
      });
    });

  },

  kill: function(what, cb) {
    cb = cb || function(){}
    pm2.connect(function() {
      pm2.delete('all', function(){
        cb();
      });
    });
  },

}