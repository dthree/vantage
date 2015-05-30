var util = require('util')
 
function hook_stdout(callback) {
    var old_write = process.stdout.write
 
    process.stdout.write = (function(write) {
        return function(string, encoding, fd) {
            write.apply(process.stdout, arguments)
            callback(string, encoding, fd)
        }
    })(process.stdout.write)
 
    return function() {
        process.stdout.write = old_write
    }
}
 
console.log('a')
console.log('b')
 
var unhook = hook_stdout(function(string, encoding, fd) {
    util.debug('stdout: ' + util.inspect(string))
})
 
console.log('c')
console.log('d')
 
unhook()
 
console.log('e')
console.log('f')

------------




      self.io.on('vantage-keypress-response', function(data) {

        if (vantage.is('server')) {

          for (var i = 0; i < vantage.sessions.length; ++i) {

            vantage.sessions[i].io.emit('vantage-keypress-response', { response: data.response });
          }

        } else {

          if (data.response !== undefined) {
            vantage.redraw(vantage._activePrompt, data.response);
          }

        }

      });


        serverKeypressHandler: function(data) {

    var key = data.key;
    var msg = data.message || '';

    if (vantage.is('client') && ['up', 'down', 'tab'].indexOf(key) > -1) {

      vantage.client.io.emit('vantage-keypress', { key: key, message: msg });

    } else {

      if (['up', 'down'].indexOf(key) > -1) {

        var str = vantage.getHistory(key);
        if (str) {
          return str;
        }

      } else if (key == 'tab') {

        var str = vantage.getAutocomplete(msg);
        if (str !== undefined) {
          return str;
        }

      } else {

        vantage._histCtr = 0;
      }
    }
  },

  keypressHandler: function(e, prompt) {

    var name = (e.key || {}).name;
    
    vantage._activePrompt = prompt;

    /*
      vantage.register({
        route: 'vantage-keypress',
        source: function(key) {
          vantage._send(key, data);
        },
        client: function(key, data) {
          vantage._send(key, data);
        },
        server: function(key, data) {
  
        },
      })
      vantage.handler({
        client: 
      });

      vantage.originate

    */


    if (vantage.is('client')) {

      vantage.client.io.emit('vantage-keypress', { key: name, message: String(prompt.rl.line).trim() });

    } else {

      if (['up', 'down'].indexOf(name) > -1) {

        var str = vantage.getHistory(name);
        if (str) {
          vantage.redraw(prompt, str);
        }

      } else if (name == 'tab') {

        var str = vantage.getAutocomplete(String(prompt.rl.line).trim());
        if (str !== undefined) {
          vantage.redraw(prompt, str);
        }

      } else {

        vantage._histCtr = 0;
      }
    }
  },

  // only called as client...
  //---------------------------------------------------------------------------
  var keyMatch = (['up', 'down', 'tab'].indexOf(key) > -1);

  if (vantage.is('local')) {

    if (keyMatch) {

      var result = vantage._getKeypressResult(name);
      if (result !== undefined) { 
        vantage.redraw(prompt, result)
      }

    } else {

      vantage._histCtr = 0;

    }

  } else {

    vantage.emit('vantage-keypress-upstream', { key: name, message: String(prompt.rl.line).trim() });

  }

  //---------------------------------------------------------------------------
  //---------------------------------------------------------------------------


  vantage.on('vantage-keypress-upstream', function(data) {

    if (vantage.is('proxy')) {

      vantage.pipe('vantage-keypress-upstream', 'upstream', data);
    
    } else {

      var response = vantage._getKeypressResult(data.key);

      vantage.emit('vantage-keypress-downstream', 'downstream', response);

    }

  });

  vantage.on('vantage-keypress-downstream', function(data){

  });




  //---------------------------------------------------------------------------



      session.io.on('vantage-keypress', function(data){

        if (vantage.is('client')) {

          // .. to do
          for (var i = 0; i < vantage.sessions.length, ++i) {

            vantage.sessions[i].io.emit('vantage-keypress', data);            
          }

        } else {

          var response = vantage.serverKeypressHandler(data);
          session.io.emit('vantage-keypress-response', { response: response });

        }

      });