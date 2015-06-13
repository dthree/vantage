
/**
 * Example of a standalone Vantage server.
 * Includes basic syntax, command syntax 
 * and firewall syntax. 
 *
 * For a chained / compressed version of 
 * all commands, jump to the bottom of the
 * file.
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
  , banner = 'Welcome to the standalone Vantage server.'
  , delimiter = 'svr:5000~$'
  , port = 5000
  , server
  ;

/**
 * Firing up a Vantage server.
 */

// Vantage is a constructor, so you want
// to instantiate a new instance when you
// use it. Done this way so you can create
// multiple servers listening under the 
// same process.
vantage = Vantage();

// Prints when you remotely connect to
// this vantage instance.
vantage.banner(banner);

// Prompt delimiter displayed when logged into.
// You can color it if you want to with `colors.js`.
// Prompts with: 
// svr:5000~$ 
vantage.delimiter(delimiter)

// Starts Vantage as a server, listening 
// on port 5000 in this case. If this is
// not set, Vantage will only be able to
// be accessed from the local terminal
// that started this Node process.
// This will create a default HTTP Server.
// 
// If you want to insert middleware into 
// Vantage's web server, throw a function 
// as the first parameter into `vantage.listen`.
//
// ex: vantage.listen(middleware, port);
vantage.listen(port);


// The local terminal that started Vantage
// will not show a Vantage prompt unless 
// you use `vantage.show()`.
vantage.show();

/**
 * Adding commands.
 */

// Registers a Vantage Command. Returns 
// a `Command` object - not Vantage.
var command = vantage.command('print [string]');

// Used for automated help.
command.description('Repeatedly prints a given string.');

// Options can use short or long forms.
command.option('-i, --iterations [nbr]', 'Prints string <nbr> times before stopping. Defaults to 10.')  
command.option('-s, --sleep [millis]', 'Sleeps for <milllis> millis between prints. Defaults to 200.')

// Given action on execution.
command.action(action);

function action(args, callback){
  var iterations = args.options.iterations || 10
    , sleep = args.options.sleep || 200
    , str = args.string || 'Fork me on Github.'
    , ctr = 0;
    ;

  var print = function() {
    ctr++;
    console.log(str);
    if (ctr < iterations) {
      setTimeout(function(){
        print();
      }, sleep)
    } else {
      callback();
    }
  }

  print();
}

/**
 * Firewall
 */

// If connecting IP does not match a policy, 
// reject it. This defaults to ACCEPT, 
// meaning all connections will be accepted.
vantage.firewall.policy('REJECT');

// Accepts all connection on the 
// 192.168.0.0/16 subnet.
vantage.firewall.accept('192.168.0.0/16');

// Reject a specific IP.
vantage.firewall.reject('10.40.50.24/32');

// Accepts all remaining connections on 
// the '10.0.0.0/8' subnet.
vantage.firewall.accept('10.0.0.0/8');

/**
 * Chaining
 *
 * The above is the verbose way of doing 
 * things. Most Vantage functions chain,
 * so all of the above can be compressed
 * into the following:
 */

/**

server = Vantage()
 .banner(banner)
 .delimiter(delimiter)
 .listen(port + 1)
 .show();

server
  .command('print [string]')
  .description('Repeatedly prints a given string.')
  .option('-i, --iterations <nbr>', 'Prints string <nbr> times before stopping. Defaults to 10.')
  .option('-s, --sleep <millis>', 'Sleeps for <milllis> milliseconds between prints. Defaults to 200.')
  .action(action);

server.firewall
  .policy('REJECT')
  .accept('192.168.0.0/16')
  .reject('10.40.50.24/32')
  .accept('10.0.0.0/8');

 */
