/**
 * The purpose of this tour is to tour you
 * through the main user features of Vantage,
 * and illustrate what it is capable of doing.
 *
 * For samples on coding vantage, check out the
 * other examples - this isn't the best place to
 * start.
 */

"use strict";

var Vantage = require("../../")
  , tools = require("./server")
  , util = require("./../../lib/util")
  , log = (require("./../../lib/logger"))
  , chalk = require("chalk")
  ;

var server = new Vantage();

var banner =
  util.pad("", 80, "\n") + "\n" +
  util.pad("", process.stdout.columns, "#") + "\n" +
  util.pad("# ", process.stdout.columns - 1, " ") + "#" + "\n" +
  "#" + util.pad("", (process.stdout.columns / 2) - 17, " ") + "Welcome to the Vantage tour!" + util.pad("", (process.stdout.columns / 2) - 18, " ") + " #" + "\n" +
  util.pad("# ", process.stdout.columns - 1, " ") + "#" + "\n" +
  util.pad("", process.stdout.columns, "#") + "\n" +
  util.pad("", 0, "\n") + "";

var hdr = chalk.grey("#");

var commands = function(svr) {

  svr
    .command("port")
    .description("Gives Vantage's listening port.")
    .action(function(args, cb){
      this.log(this.server._port);
      cb();
    });

  svr
    .command("start server <port>")
    .description("Starts a new Vantage tour server.")
    .action(function(args, cb){
      if (isNaN(args.port)) { console.log(chalk.yellow("\n  Er... Ports are usually numbers...\n")); cb(); return; }
      if (args.port < 3001) { console.log(chalk.yellow("\n  Eh, not sure if you are sudo, so pick a port above 3000.\n")); cb(); return; }
      console.log("\n  Spawning a new Vantage server on port " + args.port + "...\n");

      var welcome = "\n  Welcome to your new server on port " + args.port + "!";
      var vtg = new Vantage();

      vtg
        .delimiter("toursvr:" + args.port + "~$")
        .banner(welcome)
        .use(tools)
        .listen(args.port);

      cb();
    });

};

var steps = {

  step1: function() {
    log.br().cols(2, [2, hdr], 1, chalk.cyan("1. To start, press [enter] 3 times.")).br();
    server.on("client_prompt_submit", steps.step1Listener);
  },

  step1Listener: function(e) {
    this.counter = this.counter || 0;
    if (e === "") {
      ++this.counter;
    } else {
      log.br().cols(2, [2, hdr], 1, chalk.yellow("Don't get too excited - let's press [enter] 3 times first."));
      this.counter = 0;
    }
    if (this.counter > 2) {
      server.removeListener("client_prompt_submit", steps.step1Listener);
      steps.step2();
    }
  },

  step2: function() {
    log.br().cols(2, [2, hdr], 1, chalk.cyan("2. Now, type 'help' and press [enter].\n"));
    server.on("client_command_executed", steps.step2Listener);
  },

  step2Listener: function(data) {
    if (String(data.command).trim().toLowerCase() === "help") {
      server.removeListener("client_command_executed", steps.step2Listener);
      log.cols(2, [2, hdr], 1, chalk.white("Above are all of the available commands you can execute.")).br();
      steps.step3();
    } else {
      log.cols(2, [2, hdr], 1, chalk.yellow("Hmmm... Let's try the 'help' command.")).br();
    }
  },

  step3: function() {
    log.cols(2, [2, hdr], 1, chalk.cyan("3. Press the [up] arrow on your keyboard to pull up the last command. Then press [enter] and run help again.")).br();
    server.on("client_command_executed", steps.step3Listener);
  },

  step3Listener: function(data) {
    if (String(data.command).trim().toLowerCase() === "help") {
      server.removeListener("client_command_executed", steps.step3Listener);
      steps.step4();
    }
  },

  step4: function() {
    log.cols(2, [2, hdr], 1, chalk.cyan("4. Vantage supports auto-completion as well. Type 'he' and press the [tab] key. Then press [enter] to run help again.")).br();
    server.on("client_command_executed", steps.step4Listener);
  },

  step4Listener: function(data) {
    if (String(data.command).trim().toLowerCase() === "help") {
      server.removeListener("client_command_executed", steps.step4Listener);
      steps.step5();
    }
  },

  step5: function() {
    log.cols(2, [2, hdr], 1, chalk.white("Starting to feel like a normal CLI?")).br();
    log.cols(2, [2, hdr], 1, chalk.cyan("5. Now, let's fire up another Vantage server. I made a command for you:")).br();
    log.cols(5, chalk.cyan("start server [port]")).br();
    log.cols(2, [2, hdr], 1, chalk.cyan("You can pick the port.")).br();
    server.on("client_command_executed", steps.step5Listener);
  },

  step5Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf("start server") > -1) {
      var port = String(data.command).split(" ");
      port = port[port.length - 1];
      if (port < 3001) { return; }
      if (isNaN(port)) { return; }
      server.removeListener("client_command_executed", steps.step5Listener);
      steps.step6(port);
    }
  },

  step6: function(port) {
    log.cols(2, [2, hdr], 1, chalk.white("That created another instance of Vantage, which is now listening to port " + port + " on a different process."));
    log.br().cols(2, [2, hdr], 1, chalk.cyan("6. Let's connect to it:")).br();
    log.cols(5, chalk.cyan("vantage " + port + "")).br();
    server.on("client_command_executed", steps.step6Listener);
  },

  step6Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf("vantage") > -1) {
      server.removeListener("client_command_executed", steps.step6Listener);
      setTimeout(function(){
        steps.step7();
      }, 50);
    }
  },

  step7: function() {
    log.br().cols(2, [2, hdr], 1, chalk.white("You're in. Notice the prompt changed."));
    log.br().cols(2, [2, hdr], 1, chalk.cyan("7. To verify we are on the new server, run 'port' to get this server\'s listening port.")).br();
    server.on("client_command_executed", steps.step7Listener);
  },

  step7Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf("port") > -1) {
      server.removeListener("client_command_executed", steps.step7Listener);
      steps.step8();
    }
  },

  step8: function() {
    log.br().cols(2, [2, hdr], 1, chalk.white("That looks about right. When you type 'help', you\'ll notice this server has less commands than the last one. Play around a bit - you\'ll see everything works the same, but on this new server. You can hop through as many Vantage instances as you would like."));
    log.br().cols(2, [2, hdr], 1, chalk.cyan("8. Let\'s see what this server has to say. Use 'help' and figure out how to turn debug mode on for the app.")).br();
    server.on("client_command_executed", steps.step8Listener);
  },

  step8Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf("debug off") > -1) {
      server.removeListener("client_command_executed", steps.step8Listener);
      steps.step9();
    }
  },

  step9: function() {
    log.br().cols(2, [2, hdr], 1, chalk.cyan("9. Let's import a node module in realtime to add another command to Vantage.")).br();
    log.cols(5, chalk.cyan("use vantage-hacker-news")).br();
    server.on("client_command_executed", steps.step9Listener);
  },

  step9Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf("use vantage-hacker-news") > -1) {
      server.removeListener("client_command_executed", steps.step9Listener);
      setTimeout(function(){
        steps.step10();
      }, 50);
    }
  },

  step10: function() {
    log.br().cols(2, [2, hdr], 1, chalk.white("That just installed the module 'vantage-hacker-news' from the NPM registry. This module adds a command to Vantage which displays the top items currently on Hacker News. By running 'help', you'll see the command 'hacker-news' is now registered."));
    log.br().cols(2, [2, hdr], 1, chalk.cyan("10. Run the newly registered command.")).br();
    server.on("client_command_executed", steps.step10Listener);
  },

  step10Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf("hacker-news") > -1) {
      server.removeListener("client_command_executed", steps.step10Listener);
      setTimeout(function(){
        steps.step11();
      }, 50);
    }
  },

  step11: function() {
    log.br().cols(2, [2, hdr], 1, chalk.white("You can build your own Vantage extensions like the above."));
    log.br().cols(2, [2, hdr], 1, chalk.cyan("11. A 'mode' is a special command that puts you in a dedicated session for doing a particular type of action. For example, in REPL mode, every command you type is interpreted as javascript in the context of your application. Let's enter REPL mode:")).br();
    log.cols(5, chalk.cyan("repl")).br();
    server.on("client_command_executed", steps.step11Listener);
  },

  step11Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf("repl") > -1) {
      server.removeListener("client_command_executed", steps.step11Listener);
      setTimeout(function(){
        steps.step12();
      }, 50);
    }
  },

  step12: function() {
    log.br().cols(2, [2, hdr], 1, chalk.white("Notice that REPL has been added to the delimiter."));
    log.br().cols(2, [2, hdr], 1, chalk.cyan("12. Play around with some javascript commands. When done, exit the mode by typing 'exit'.")).br();
    server.on("client_command_executed", steps.step12Listener);
  },

  step12Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf("exit") > -1) {
      server.removeListener("client_command_executed", steps.step12Listener);
      setTimeout(function(){
        steps.step13();
      }, 50);
    }
  },

  step13: function() {
    log.br().cols(2, [2, hdr], 1, chalk.white("Getting the hang of it?"));
    log.br().cols(2, [2, hdr], 1, chalk.cyan("8. Run 'exit' to go back to the first server (this doesn\'t exit the process - just your viewing session).")).br();
    server.on("client_command_executed", steps.step13Listener);
  },

  step13Listener: function(data) {
    if (String(data.command).trim().toLowerCase().indexOf("exit") > -1) {
      server.removeListener("client_command_executed", steps.step8Listener);
      setTimeout(function(){
        steps.step14();
      }, 50);
    }
  },

  step14: function() {
    log.br().cols(2, [2, hdr], 1, chalk.white("Welcome back. By the way, you've now used four of Vantage's built in commands:"));
    log.br().cols(5, chalk.white("help [command]"));
    log.br().cols(5, chalk.white("vantage [server]"));
    log.br().cols(5, chalk.white("use [module]"));
    log.br().cols(5, chalk.white("exit"));
    log.br().cols(2, [2, hdr], 1, chalk.white("That concludes the tour and shows some of the things Vantage can do! To get started building your own Vantage magic, check out the other examples."));
    log.br().cols(2, [2, hdr], 1, chalk.cyan("9. To fully exit the tour, type 'exit -f'.")).br();
  }

};

log = log(server);

server
  .use(commands)
  .delimiter("tour~$")
  .banner(banner)
  .show();

steps.step1();

