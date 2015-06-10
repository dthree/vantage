/**
 * The purpose of this tutorial is to tour you 
 * through the main user features of Vantage, 
 * and illustrate what it is capable of doing.
 *
 * For samples on coding vantage, check out the
 * other examples - this isn't the best place to 
 * start.
 */

var Vantage = require('../../')
  , pm2 = require('./pm2')
  , util = require('./../../lib/util')
  , colors = require('colors')
  ;

var banner =  
  util.pad('', 80, '\n') + '\n' +  
  util.pad('', process.stdout.columns, '#') + '\n' +  
  util.pad('# ', process.stdout.columns-1, ' ') + '#' + '\n' +  
  '#' + util.pad('', (process.stdout.columns/2)-17, ' ') + 'Welcome to the Vantage Tutorial!' + util.pad('', (process.stdout.columns/2)-18, ' ') + ' #' + '\n' +  
  util.pad('# ', process.stdout.columns-1, ' ') + '#' + '\n' +  
  util.pad('', process.stdout.columns, '#') + '\n' + 
  util.pad('', 0, '\n') + '';
  
var commands = function(svr, opt) {

  svr
    .command('step <number>')
    .description('Skips to a step on the tutorial.')
    .action(function(args, cb){
      cb();
    });

  svr
    .command('port')
    .description("Gives Vantage's listening port.")
    .action(function(args, cb){
      console.log(this._port)
      cb();
    });

  svr
    .command('start server <port>')
    .description('Starts a new Vantage Tutorial server.')
    .action(function(args, cb){
      if (isNaN(args.port)) { console.log('\n  Er... Ports are usually numbers...\n'.yellow); cb(); return; }
      if (args.port < 3001) { console.log('\n  Eh, not sure if you are sudo, so pick a port above 3000.\n'.yellow); cb(); return; }
      console.log('\n  Spawning a new Vantage server on port ' + args.port + '...');
      pm2.spawn({
        ports: [args.port]
      }, function(err) {
        console.log('  Successfully spawned server.');
        cb('Started!');
      });
    });

}

var steps = {

  step1: function() {
    server.log("  1. To start, press [enter] 3 times.\n".cyan);
    server.on('client_prompt_submit', steps.step1Listener);
  },

  step1Listener: function(e) {
    this.counter = this.counter || 0;
    if (e == '') {
      this.counter++;
    } else {
      server.log("\n  Don't get too excited - let's press [enter] 3 times first.".yellow);
      this.counter = 0;
    }
    if (this.counter > 2) {
      server.log('\n  Well done! Feels like a normal CLI, right?'.white);
      server.removeListener('client_prompt_submit', steps.step1Listener);
      steps.step2();
    }
  },

  step2: function() {
    server.log('  2. Now, type "help" and press [enter].\n'.cyan);
    server.on('client_command_executed', steps.step2Listener);
  },

  step2Listener: function(data) {
    if (String(data.command).trim().toLowerCase() == 'help') {
      server.removeListener('client_command_executed', steps.step2Listener);
      server.log('  Awesome! Those are all of the available commands you can execute.'.white);
      steps.step3();
    } else {
      server.log("\n  Hmmm... Let's try the 'help' command.".yellow);
    }
  },

  step3: function() {
    server.log("  3. Now, Press the 'up' arrow on your keyboard to pull up the last command.\n  Then press [enter] and run help again.\n".cyan);
    server.on('client_command_executed', steps.step3Listener);
  },

  step3Listener: function(data) {
    if (String(data.command).trim().toLowerCase() == 'help') {
      server.removeListener('client_command_executed', steps.step3Listener);
      server.log('  The full command history for the duration of the node session is stored.'.white);
      steps.step4();
    } 
  },

  step4: function() {
    server.log("  4. You can use tabbed auto-completion, too!.\n  Type 'he' and press the tab key. Then run help.\n".cyan);
    server.on('client_command_executed', steps.step4Listener);
  },

  step4Listener: function(data) {
    if (String(data.command).trim().toLowerCase() == 'help') {
      server.removeListener('client_command_executed', steps.step4Listener);
      steps.step5();
    } 
  },

  step5: function() {
    server.log("  5. Okay! Now, let's fire up another Vantage server.\n  I made a command for you - enter 'start server [port]'\n  You can pick the port.\n".cyan);
    server.on('client_command_executed', steps.step5Listener);
  },

  step5Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf('start server') > -1) {
      var port = String(data.command).split(' ');
      port = port[port.length-1];
      if (port < 3001) { return; }
      if (isNaN(port)) { return; }
      server.removeListener('client_command_executed', steps.step5Listener);
      steps.step6(port);
    } 
  },

  step6: function(port) {
    server.log("\n  6. Great! Now let's connect to it!".cyan);
    server.log(String("  Type 'vantage " + port + "'\n").cyan);
    server.on('client_command_executed', steps.step6Listener);
  },

  step6Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf('vantage') > -1) {
      server.removeListener('client_command_executed', steps.step6Listener);
      setTimeout(function(){
        steps.step7();
      }, 500)
    } 
  },

  step7: function(port) {
    server.log("\n  You're in!\n  Check out the prompt: look different?".white);
    server.log("\n  7. Let's make sure we're on the new server.\n  Type 'port' to get this server's port.\n".cyan);
    server.on('client_command_executed', steps.step7Listener);
  },

  step7Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf('port') > -1) {
      server.removeListener('client_command_executed', steps.step7Listener);
      steps.step8();
    } 
  },

  step8: function(port) {
    server.log("\n  That looks about right.\n  If you type 'help', you'll notice this server has less commands too.".white);
    server.log("\n  Play around a bit - you'll see everything works the same,\n  but on this new server.".white);
    server.log("\n  You aren't really 'logged in' to it, Vantage is just really \n  good at tricking you.".white);
    server.log("\n  8. Let's see what this server has to say. \n  Type 'debug on'.\n".cyan);
    server.on('client_command_executed', steps.step8Listener);
  },

  step8Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf('debug off') > -1) {
      server.removeListener('client_command_executed', steps.step8Listener);
      steps.step9();
    } 
  },

  step9: function(port) {
    server.log("\n  Sweet!".white);
    server.log("\n  8. Type 'exit' to go back to the first server.".cyan);
    server.log("  This doesn't exit the process - just your viewing session.\n".cyan);
    server.on('client_command_executed', steps.step9Listener);
  },

  step9Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf('exit') > -1) {
      server.removeListener('client_command_executed', steps.step8Listener);
      setTimeout(function(){
        steps.step10();
      }, 500)
    } 
  },

  step10: function(port) {
    server.log("\n  Nice. By the way, you've now used all of Vantage's built in commands:\n\n  help [command]\n  vantage [server]\n  exit".white);
    server.log("\n  That concludes the tour and shows some of the things Vantage can do!".white);
    server.log("\n  To get started building your own Vantage magic, check out the other examples.".white);
    server.log("\n  9. To fully exit the tutorial, type 'exit -f'.\n".cyan);
  },

}

var server = new Vantage();

server
  .use(commands)
  .delimiter('tutorial~$')
  .banner(banner)
  .show();

steps.step1();

