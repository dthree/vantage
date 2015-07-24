<p align="center">
  <img src="http://i.imgur.com/NyusmRJ.png" alt="vantage.js" />
</p>
<p align="center">
  <img src="https://travis-ci.org/dthree/vantage.svg" alt="Build Status" />
  <a href="https://gitter.im/dthree/vantage?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge">
    <img src="https://img.shields.io/badge/gitter-join%20chat-brightgreen.svg" alt="Gitter" />
  </a>
</p>


<p align="center"><i>
  Vantage is nearly ready for 1.0!
  <br>
  <a href="https://github.com/dthree/vantage/releases">New features & updates.</a>
  <br><br>
  All feedback and bug hunters welcome.
</i></p>

<br>

`Vantage.js` = `CLI` + `SSH` + `REPL` for your live node app. In one line:

`require("vantage")().listen(4000);`

<br>

<p align="center">
  <img src="http://i.imgur.com/ZwAxqv4.gif" alt="vantage.js demo" />
</p>


<br>

* [What just happened?](#er-that-gif-im-so-confused)
* [That's voodoo magic: show me the code](https://github.com/dthree/vantage/tree/master/examples/spiffy-gif/)
* [Tell me more](#contents)

## Contents

* [Introduction](#introduction)
* [Getting Started](#getting-started)
  - [Tutorial](#tutorial)
  - [Examples](#examples)
  - [Quick Start](#quick-start)
* [Methods](#methods)
  - [.command](#commandcommand-description)
  - [.mode](#modecommand-description)
  - [.delimiter](#delimiterstring)
  - [.banner](#bannerstring)
  - [.show](#show)
  - [.listen](#listenapp-options)
* [Events](#events)
* [Automation](#automation)
* [Firewall](#firewall)
* [Authentication](#authentication)
* [Extensions](#extensions)
  - [Creating an Extension](#creating-an-extension)
* [License](#license)
* [Footnotes](#footnotes)

## Introduction

Vangtage gives you a new perspective into your live node application not previously available.

Inspired by and based on [commander.js](https://www.npmjs.com/package/commander), Vantage turns your live Node app into a CLI with an interactive prompt provided by [inquirer.js](https://www.npmjs.com/package/inquirer). Accessible locally or remotely, Vantage lets build your own API and import community extensions, introducing the possibility of live activity and diagnostics for your `dev` and `prod` environments.

- Node now has a first-class CLI: tab-completion, history, you name it.
- Build your own API with the familiar syntax of `commander.js`.
- Build and use community extensions for suites of commands: coded or in realtime.
- Production ready, with authentication middlware and a basic firewall.
- Built-in REPL.

Unlike other REPL or CLI modules, Vantage allows you to remotely connect to your live app and access the CLI transparently, exactly as you would in an SSH session. Vantage can connect through an unlimited number of live Node instances across multiple machines, piping commands and information to and from your local terminal. 

## Getting Started

##### Tour

[This Vantage tour](https://github.com/dthree/vantage/tree/master/examples/tour) will give you a live walk-through of vantage's features.

```bash
$ npm install -g vantage
$ vantage tour
```

##### Examples

- [Standalone Vantage Server](https://github.com/dthree/vantage/tree/master/examples/server)
- [Koa.js with Vantage](https://github.com/dthree/vantage/tree/master/examples/koa)
- [Express.js with Vantage](https://github.com/dthree/vantage/tree/master/examples/express)
- [Using the "mode" command](https://github.com/dthree/vantage/tree/master/examples/mode)
- [Using the Firewall](https://github.com/dthree/vantage/tree/master/examples/firewall)

##### Quick Start

First, install `vantage` globally:

```bash
$ npm install -g vantage
```

Now, add the following to a file named `server.js`.

```js
// Create a new instance of vantage.
var vantage = require("vantage")();

// Add the command "foo", which logs "bar".
vantage
  .command("foo")
  .description("Outputs 'bar'.")
  .action(function(args, callback) {
    this.log("bar");
    callback();
  });
  
// Name your prompt delimiter 
// "websvr~$", listen on port 80 
// and show the Vantage prompt.
vantage
  .delimiter("websvr~$")
  .listen(80)
  .show();
```
Run `server.js`. You Node app has become a CLI.

```bash
$ node server.js
websvr~$ 
```

Open another terminal. Because Vantage is listening on port 80, you can remotely connect to it:

```bash
$ vantage 80
$ Connecting to 127.0.0.1:80 using http...
websvr~$ 
```

Try out your "foo" command.

```bash
websvr~$ foo
bar
websvr~$
```

Now type "help" to see Vantage's built in commands in addition to "foo":

```bash
websvr~$ help

  Commands
  
    help [command]    Provides help for a given command.
    exit [options]    Exists instance of Vantage.
    use <module>      Installs a vantage extension in realtime.
    vantage [server]  Connects to another application running vantage.
    foo               Outputs "bar".

websvr~$
```

That's the basic idea. Once you get the hang of it, read on to learn some of the fancier things Vantage can do.

## Methods

### .command(command, [description])

Adds a new command to your command line API. Returns a `Command` object, with the following chainable functions:

* [`.description(string)`](#commanddescriptionstring): Used in automated help for your command.
* [`.hidden()`](#commandhidden): Removes command from help menus.
* [`.option(string, [description])`](#commandoptionstring-description): Provides command options, as in `-f` or `--force`.
* [`.action(function)`](#commandactionfunction): Function to execute when command is executed.

```js
vantage
  .command("foo")
  .description("Outputs 'bar'.")
  .action(function(args, callback) {
    this.log("bar");
    callback();
  });
```
The syntax is similar to `commander.js` with the exception of allowing nested sub-commands for grouping large APIs into managable chunks.

```js
// Simple command with no arguments.
vantage.command("foo", "Description of foo.");

// Optional argument.
vantage.command("foo [bar]"); 

// Required argument.
vantage.command("foo <bar>"); 

// Examples of nested subcommands:
vantage.command("farm animals");
vantage.command("farm tools");
vantage.command("farm feed [animal]");
vantage.command("farm with farmer brown and reflect on <subject>");
```
Descriptions can optionally be passed in as the second parameter, which are used to build the automated help.

##### Sub-commands

When displaying the help menu, sub-commands will be grouped separately:

```bash
webapp~$ help

  Commands: ( ... )
  
  Command Groups:
  
    farm *            4 sub-commands.

```
Entering "farm" or "farm --help" would then drill down on the commands:

```bash
webapp~$ farm

  Commands:
  
    farm animals        Lists all animals in the farm.
    farm tools          Lists all tools in the farm.
    farm feed [animal]  Feeds a given animal.
  
  Command Groups:
  
    farm with *          1 sub-command.
    
```

#### .command.description(string)

If you don't pass a description into `vantage.command(...)` above, you can use the `description` function as an alternative.

```js
vantage
  .command("foo")
  .description("outputs bar")
  // ...
```

#### .command.hidden()

Makes the command invisible, though executable. Removes from all automated help menus.

#### .command.option(string, [description])

You can provide both short and long versions of an option. Examples:

```js
vantage
  .command("random", "Does random things.")
  .option('-f, --force', 'Force file overwrite.')
  .option('-a, --amount <coffee>', 'Number of cups of coffee.')
  .option('-v, --verbosity [level]', 'Sets verbosity level.')
  .option('-A', 'Does amazing things.')
  .option('--amazing', 'Does amazing things')
  // ...
```

#### .command.action(function)

This is the action execution function of a given command. It passes in an `arguments` object and `callback`.

Actions are executed async and must either call the passed `callback` upon completion or return a `Promise`.

```js
// As a callback:
command(...).action(function(args, cb){
  var self = this;
  doSomethingAsync(function(results){
    self.log(results);
    // If this is not called, Vantage will not 
    // return its CLI prompt after command completion.
    cb();
  });
});

// As a newly created Promise:
command(...).action(function(args, cb){
  return new Promise(function(resolve, reject) {
    if (skiesAlignTonight) {
      resolve();
    } else {
      reject("Better luck next time");
    }
  });
});

// Or as a pre-packaged promise of your app:
command(...).action(function(args, cb){
  return app.promisedAction(args.action);
});
```

##### Action Arguments

Given the following command:

```js
vantage
  .command('order pizza [type]', 'Orders a type of food.')
  .option('-s, --size <size>', 'Size of pizza.')
  .option('-a, --anchovies', 'Include anchovies.')
  .option('-p, --pineapple', 'Include pineapples.')
  .option('-o', 'Include olives.')
  .option('-d, --delivery', 'Pizza should be delivered')
  .action(function(args, cb){
    this.log(args);
    cb();
  });
```
Args would be returned as follows:

```bash
$webapp~$ order pizza pepperoni -pod --size "medium" --no-anchovies
{
  "type": "pepperoni",
  "options": {
    "pineapple": true,
    "o": true,
    "delivery": true,
    "anchovies": false,
    "size": "medium",
  }
}
```

##### Action Context (Session)

The `this` variable in a `command.action` function is exposed to a special "Session" context. This context has a few functions to make use of:

##### session.log(string)

Any and all logging in `command.action` should be done through `this.log`, which behaves exactly like `console.log`. This ensures all output for your given Vantage session is piped back to your original TTY, regardless how many hops into other servers you have made with Vantage.

```js
vantage
  .command("foo", "Outputs 'bar'.")
  .action(function(args, callback) {
    
    // This will pipe back to your terminal.
    this.log("bar");

    // This will only log on the remote terminal,
    // and you will not see it on your local TTY.
    console.log("bar"); 

    callback();
  });
```

##### session.prompt(object, [callback])

Vantage supports mid-command prompting. You can make full use of [inquirer.js](https://www.npmjs.com/package/inquirer)'s `prompt` function, which is exposed through `this.prompt`.

Regardless of a direct vantage connection or one proxying your request through ten hops, `vantage.prompt` will send the remote prompt request to your local client and pipe response back to the remote application.

```js
vantage.command('destroy database').action(function(args, cb){
  var self = this;
  this.prompt({
    type: "confirm",
    name: "continue",
    default: false,
    message: "That sounds like a really bad idea. Continue?",
  }, function(result){
    if (!result.continue) {
      self.log('Good move.');
      cb();
    } else {
      self.log('Time to dust off that resume.');
      app.destroyDatabase(cb);
    }
  });
});
```

```bash
dbsvr~$ destroy database
? That sounds like a really bad idea. Continue? y/N: N
Good move.
dbsvr~$
```

##### session.user

The currently logged on user executing the command is exposed through `this.user`. Defaults to "guest" when there is no authentication enabled.

```js
vantage
  .command("view classified information", "Shows all of our secrets.")
  .action(function(args, callback) {
    if (this.user === "president") {
      this.log(app.classifiedInformation);
    } else {
      this.log("Access Denied");
    }
    callback(true, "Access Denied");
  });
```

### .mode(command, [description])

Mode is a special type of `command` that brings the user into a given `mode`, wherein regular Vantage commands are ignored and the full command strings are interpreted literally by the `mode.action` function. This will continue until the user exits the mode by typing `exit`.

```js
vantage
  .mode("repl")
  .description("Enters the user into a REPL session.")
  .delimiter("repl:")
  .action(function(command, callback) {
    this.log(eval(command));
  });
```
```bash
$ node server.js
node~$ 
node~$ repl
node~$ repl: 
node~$ repl: 6 * 7
42
node~$ repl: Math.random();
0.62392647205
node~$ repl: exit
node~$ 
```

`mode`'s syntax is a duplicate of `command`'s, with the following additional / altered commands:

* [`.delimiter(string)`](#modedelimiterstring): Tacks on an additional prompt delimiter for orientation.
* [`.init(function)`](#modeinitfunction): Same as `command`'s `.action`, called once on entering the mode.
* [`.action(function)`](#modeactionfunction): Called on each command submission while in the mode.

#### .mode.delimiter(string)

This will add on an additional delimiter string to one's Vantage prompt upon entering the mode, so the user can differentiate what state he is in.

```js
vantage
  .mode('repl')
  .delimiter('you are in repl>')
  .action(function(command, callback) {
    this.log(eval(command));
  });
```

```bash
node~$ 
node~$ repl
node~$ you are in repl>  
```
#### .mode.init(function)

Behaves exactly like `command.action`, wherein the passed in function is fired once when the user enters the given mode. Passed the same parameters as `command.action`: `args` and `callback`. `init` is helpful when one needs to set up the mode or inform the user of what is happening.

```js
vantage
  .mode('sql')
  .delimiter('sql:')
  .init(function(args, callback){
    this.log('Welcome to SQL mode.\nYou can now directly enter arbitrary SQL commands. To exit, type `exit`.');
    callback();
  })
  .action(function(command, callback) {
    var self = this;
    app.query(command, function(res){
      self.log(res);
      callback();
    });
  });
```

```bash
node~$
node~$ sql
Welcome to SQL mode.
You can now directly enter arbitrary SQL commands. To exit, type `exit`.
node~$ sql: 
node~$ sql: select first_name, last_name from persons where first_name = 'George';

first_name        last_name
----------------  ----------------
George            Clooney
George            Smith
George            Stevens

node~$ sql: 
node~$ sql: exit
node~$
```

#### .mode.action(function)

Similar to `command.action`, `mode.action` differs in that it is repeatedly called on each command the user types until the mode is exited. Instead of `args` passed as the first argument, the full `command` string the user typed is passed and it is expected that `mode.action` appropriately handle the command. Example given above.

### .delimiter(string)

Sets the prompt delimiter for the given Vantage server.

```js
new Vantage().delimiter('appsvr:3000~$').listen(3000);
new Vantage().delimiter('appsvr:3001~$').listen(3001);
new Vantage().delimiter('appsvr:3002~$').listen(3002);
```

```bash
$ vantage 3000
appsvr:3000~$ 
appsvr:3000~$ vantage 3001
appsvr:3001~$ vantage 3002
appsvr:3002~$ exit
appsvr:3001~$ exit
appsvr:3000~$ exit -f
$
```

### .banner(string)

Sets a banner for display when logging in to a given Vantage server.

```js
var banner = 
"######################################################################" + 
"#                    Welcome to joescrabshack.com                    #" + 
"#                                                                    #" +
"#              All connections are monitored and recorded            #" + 
"#      Disconnect IMMEDIATELY if you are not an authorized user      #" + 
"######################################################################";
vantage
  .delimiter('appsvr:3000~$')
  .banner(banner)
  .listen(3000);
```

```bash
$ vantage 3000
$ Connecting to 127.0.0.1:3000...
$ Connected successfully.
######################################################################
#                    Welcome to joescrabshack.com                    # 
#                                                                    #
#              All connections are monitored and recorded            # 
#      Disconnect IMMEDIATELY if you are not an authorized user      # 
######################################################################
? user: 
```
*Note: See authentication section for auth details.*

### .show()

Attaches the TTY's CLI prompt to that given instance of Vantage. While useless for deployed servers, this is great for testing an application's functions mid development.

```js
// ... (your web server code)

vantage
  .delimiter('websvr~$')
  .show();
  
vantage
  .command('build api', 'Builds web server API.')
  .action(function(args, cb){
    return app.buildAPI();
  });
```

```bash
node websvr.js
Successfully started Web Server.
websvr~$ 
websvr~$ build API
Building API...
...
Successfully built API.
websvr~$
```
As a note, multiple instances of Vantage can run in the same Node instance. However, only one can be "attached" to your TTY. The last instance given the `show()` command will be attached, and the previously shown instances will detach.

```js
var instances = []
for (var i = 0; i < 3; ++i) {
  instances[i] = new Vantage()
    .delimiter("instance" + i + "~$")
    .command("switch <instance>", "Switches prompt to another instance.")
    .action(function(args, cb){
      instances[args.instance].show();
      cb();
    })
}

instances[0].show();
```

```bash
$ node server.js
instance0~$ switch 1
instance1~$ switch 2
instance2~$ switch 0
instance0~$
```

### .listen(app, [options or callback], [callback])

Starts Vantage as a server. 

#### Vantage as a standalone web server

If you just want it to listen on a port independent of your web application, simply pass in the port and Vantage will spawn a new HTTP server. Every time a client connects to Vantage, the connection callback will be thrown and include the `socket.io` connection object.

```js
var vantage = new Vantage();
vantage.listen(80, function(socket){
  this.log("Accepted a connection.")
});
```

#### Vantage with an existing web server

If you want Vantage to listen on the same port as your web application, you can use Vantage's `listen` function in place of your existing web server's `listen` function.

This is usefull when running clustered instances of your server, such as behind a reverse proxy, where every instance has a separate port that can only be accessed internally. In this way, you can hop into any running instance without having to remember a separate set of ports.

##### With Koa.js

```js
var koa = require('koa');
var Vantage = require('vantage');

var vantage = new Vantage();
var app = koa();

vantage.listen(app, 80);
```

##### With Express.js

```js
var express = require('express');
var Vantage = require('vantage');

var vantage = new Vantage();
var app = express();

vantage.listen(app, 80);
```
##### With SSL / advanced options

You can pass detailed options to your web server with the second argument in place of the port. These options are the same options you would pass into your web server, with a few exceptions:

- `options.port`: Tells vantage what port to listen on.
- `options.ssl`: A boolean that tells Vantage whether to spawn an HTTP or HTTPs server.
- `options.logActivity`: When true, a TTY acting as a Vantage server that receives a connection will log when clients log in and out of the server. Defaults to `false`.

Default HTTPs server example:

```js
var vantage = new Vantage();
vantage.listen(someMiddleware, {
  port: 443,
  ssl: true,
  key: fs.readFileSync('./../../server.key'),
  cert: fs.readFileSync('./../../server.crt'),
  ca: fs.readFileSync('./../../ca.crt'),
  requestCert: true,
  rejectUnauthorized: false,
});
```

## Events

Vantage extends `EventEmitter.prototype`. Simply use `vantage.on('event', fn)` and `vantage.emit('event', data)`. The following events are supported:

##### Socket.IO client / server events

Vantage uses `Socket.IO` in to handle all communication between instances. The following events map to the default `Socket.IO` events:

- `client_connect`: Maps to `connect` for `socket.io-client`.

- `client_connect_error`: Maps to `connect_error` for `socket.io-client`.

- `client_error`: Maps to `error` for `socket.io-client`.

- `client_disconnect`: Maps to `disconnect` for `socket.io-client`.

- `server_connection`: Maps to `connection` for `socket.io`.

- `server_disconnect`: Maps to `disconnect` for `socket.io`.

##### Vantage client / server events

- `client_keypress`: Fires on keypress on local client terminal.

- `client_prompt_submit`: Fires when the CLI prompt has been submitted with a command, including ''.

- `client_command_executed`: Fires at the client once the command has been received back as executed.

- `client_command_error`: Fires at the client if a command comes back with an error thrown.

- `server_command_received`: Fires at the end-server actually executing a command receives the command.

- `server_command_executed`: Fires at the end-server once the command has successfully executed.

- `server_command_error`: Fires at the end-server if the command has thrown an error.

##### Vantage general events

- `command_registered`: Fires when `vantage.command` registers a new command.

## Automation

Vantage allows you execute your API commands from javascript synchronously, using either callbacks or Promises.

### .connect(server, port, [options or callback], [callback])

Connects to another instance of Vantage. Returns callback or Promise.

```js
// With a promise
vantage.connect('127.0.0.1', 8001).then(function(data){
  // ... 
}).catch(function(err){
  console.log('Error connecting: ' + err);
});

// With a callback
vantage.connect('127.0.0.1', 8001, function(err) {
  if (!err) {
    // ... connected
  }
});
```
##### Options

- `ssl`: Set to true if server you are connecting to uses HTTPS.

### .exec(command, [callback])

Executes an API command string. Returns a callback or Promise.

```js
// Using Promises:
vantage.exec("vantage 8001").then(function(data){
  return vantage.exec("roll dough");
}).then(function(data){
  return vantage.exec("add cheese");
}).then(function(data){
  return vantage.exec("add pepperoni");
}).then(function(data){
  return vantage.exec("shape crust");
}).then(function(data){
  return vantage.exec("insert into oven");
}).then(function(data){
  return vantage.exec("wait 480000");
}).then(function(data){
  return vantage.exec("remove from oven");
}).then(function(data){
  return vantage.exec("enjoy");
}).catch(function(err){
  console.log("Error baking pizza: " + err);
  app.orderOut();
});

// Using callbacks:
vantage.exec("vantage 8001", function(err, data) {
  if (!err) {
    vantage.exec("bake pizza", function(err, pizza){
      if (!err) {
        app.eat(pizza);
      }
    });
  }
});
```

### .pipe(function)

Captures all session `stdout` piped through Vantage and passes it through a custom function. The string returned from the function is then logged.

```js
var onStdout = function(stdout) {
  app.writeToLog(stdout);
  return "";
}

vantage
  .pipe(onStdout)
  .connect("127.0.0.1", 80, {});
```

## Firewall

If your Vantage server is listening on a public-facing web port such as 80 or 443, your organization's firewall is not going to help you. This is a barebones IP firewall for limiting connections down to your internal subnets. For sensitive applications, this obviously does not replace authentication.

### .firewall.policy(string)

Sets the default policy for the firewall to either `ACCEPT` or `REJECT`. Any request that does not match a rule will fall back to this policy. Returns `vantage.firewall`.

**Defaults to `ACCEPT`.** 

```js
// This will reject all remote connections.
vantage.firewall.policy("REJECT");
```

### .firewall.accept(address, [subnet])

Allows a particular address / subnet to connect to Vantage. Returns `vantage.firewall`. If no arguments are passed, returns the currently applied policiy.

```js
vantage.firewall
  .policy("REJECT")
  .accept("10.0.0.0/8")
  .accept("192.168.0.0", 24);

console.log(vantage.firewall.policy()) // -> REJECT  
```

### .firewall.reject(address, [subnet])

Denies access to a particular address / subnet. Returns `vantage.firewall`.

```js
vantage.firewall
  .policy("ACCEPT")
  .reject("64.0.0.0", 8)
  .reject("192.168.0.0/16");
```
### .firewall.rules()

Returns an array of applied rules.

```js
console.log(vantage.firewall.rules());
// -> [{ ip: "64.0.0.0", subnet: 8, rule: "REJECT" }]
```

### .firewall.reset()

Reverts `vantage.firewall` to an `ACCEPT` policy and erases all rules.

## Authentication

Vantage supports authentication strategies as middleware. It comes with a default [Basic Authentication module](https://github.com/vantagejs/vantage-auth-basic).

### vantage.auth(middleware, options)

Uses a given authentication strategy. Pass the required middleware into the first variable, and any options / configuration for that middleware as given in that module's documentation into the options parameter.

```js
var pam = require("vantage-auth-pam");
vantage.auth(pam, options);
```

Vantage Basic Auth is built in, and so can be used with the "basic" string instead of requiring a module. 

```js
var users = [
    { user: "admin", pass: "4k#842jx!%s" },
    { user: "user", pass: "Unicorn11" }
];

var vantage = require("vantage")();

vantage.auth("basic", {
  "users": users,
  "retry": 3,
  "retryTime": 500,
  "deny": 1,
  "unlockTime": 3000
});
```

##### Security Note

If no `vantage.auth` function is declared, your app will not require authentication. As a security measure, if your `NODE_ENV` environmental variable is not set to "development" and there is no authentication, Vantage will disallow remote connections. To permit remote connections without authentication, simply set your `NODE_EVN` to "development".

##### Building Authentication Strategies

You can publish your own custom authentication strategies for Vantage.js as its own Node module.

*I am currently looking to team up with a rocket scientist like you to build a pam-based authentication strategy for Vantage. If you are interested, send me a note!*

The format for publishing a strategy is simple:

```js

module.exports = function(vantage, options) {

  // The Vantge instance is exposed through
  // the `vantage` parameter. `options` exposes
  // options passed in by the strategy's user, and
  // defined by you.

  // This is where you can persist the logon state of 
  // the users attempting to log in, etc.

  // You return a function, which executes
  // in the same context as a vantage command.
  // Every time the user attempts to connect,
  // this function runs. In it you can prompt
  // the user, etc.
  return function(args, callback) {

    /** 
     * Args exposes several pieces of data
     * you can use:
     * {
     *   // If the user pre-passes auth data, it will be
     *   // available here. Otherwise, prompt him for it.
     *   user: "admin", 
     *   pass: "Unicorn11",
     *   // This is based on socket.io's connection handshake,
     *   // and has a lot more data than this.
     *   handshake: { 
     *     host: "192.168.0.1",
     *     port: "800"
     *   }
     * }
     */

    // Prompt user / look up credentials, etc.

    // Authentication is determined by your
    // callback: `callback(message, authenticated)`.

    // Example of rejected auth.
    callback("Invalid credentials.", false);

    // Example of accepted auth.
    // callback(void 0, true);
  }

}

``` 

## Extensions

Vantage supports command extensions and this is the primary reason for supporting sub-commands. For example, someone could create a suite of server diagnostic commands under the namespace `system` and publish it as `vantage-system`.

##### Programmatic use

Vantage has a `.use(extension)` function, which expects a Node module extension (exposed as a function). You can also pass in the string of the module as an alternative, and `vantage` will `require` it for you.

```js
var system = require('vantage-system');
vantage.use(system);

/* 
  Your API would now include a suite of system commands:
  system list processes
  system status
  system ... etc.
*/
```

```js
// Does the same thing as above.
vantage.use('vantage-system');
```

##### Realtime use

Forgot to install a useful extension in development and now you need it live? No problem.

Vantage has a built-in `use` command, which will automatically import a given NPM module acting as a `vantage` extension, and register the commands contained inside while the app is still live. This import has an in-memory lifecycle and the module is dumped when the thread quits.

```bash
node~$
node~$ use vantage-repl
Installing vantage-repl from the NPM registry:
Successfully registered 1 new command.
node~$
node~$ repl
node~$ repl: 6*8
48
node~$ repl:
```

### Creating an extension

Creating and publishing a Vantage extension is simple. Simply expose your module as a function which takes two parameters - `vantage` and `options`. When your module is imported by `vantage`, it will pass itself in as the first object, and so you are free to add any commands or configuration that `vantage` supports.

```js
module.exports = function(vantage, options) {
  
  vantage.
    .command("foo", "Outputs 'bar'.")
    .action(function(args, cb){
      this.log("bar");
      cb();
    });

  // ... more commands!

}
```

The options exist so the user can pass in customizations to your module. In documenting your `vantage` extension, you would lay out your supported options for the user.

## Roadmap

- Suggest something!

## License

MIT

## Footnotes

##### Er, that GIF... I'm so confused...

That's okay. Here's what happened:

1. In my terminal, I started a local Node web server:

```js
$ node websvr.js
```

Normally, you would simply see what you logged, and would have no interaction with Node. Instead, Vantage gave us a prompt:

```bash
websvr~$ 
```

2. I typed `help`, which gave me a list of all of Vantage's built-in commands as well as commands I added.

3. In my `websvr.js`, I gave Vantage a command that would turn on logging *only for* web requests. By logging domains of activity, this assists productivity in debugging. To run this, I typed `debug web`, and it started logging all web requests.

4. I then typed `debug off`, which disabled log output. 

5. By then entering the `repl` command, I entered a special REPL "mode" where I can access the raw javascript and objects in my application, while it's running. This is the equivilant of running `$ node` in your terminal, except it is in the context of your live application!

6. Satisfied with `repl` mode, I exited out of it with the `exit` command.

7. So that's nice, you can access the local Node instance in your terminal. But what about remote or daemonized applications? By using the built-in `vantage` command, I remotely connect to my Node database API listening on port `5001`, by running `vantage 127.0.0.1:5001`. 

8. Just like SSH, I'm now "in" the new instance, and my prompt changed to `dbsvr~$`.

9. This server supports another Vantage mode. By typing `sql`, I enter "sql mode". Using this, I typed an arbitrary SQL command and it connected to my database and executed it. When done, I entered `exit`.

10. I felt like checking out the latest trend on Hacker News. I typed `help` and was disappointed to find there was no `hacker-news` API command.

11. Fortunately, someone made an extension for that - an NPM module called `vantage-hacker-news`. To download it and import the commands into Vantage in realtime, I typed `use vantage-hacker-news`.

12. With this command, `vantage` did a temporary `npm install` on the module and loaded it into the application's memory. By typing `help` again, I can see I now have a new Vantage command registered: `hacker-news`!

13. I used the command: `hacker-news --length 3`, and this showed me the top 3 items trending on Hacker News. One of them was obviously an article on the Node event loop, because Node is awesome.

14. Satisfied, I typed `exit`, which brought me back to my web server.

15. I then typed `exit -f` (for `--force`) to actually quit the web server, which was running locally in my terminal.

* [Ah. Show me the GIF again](#)
* [I get it, I get it. *Tell me more*](#contents)

<br>

---

<br>

<p align="center">
  <img src="http://i.imgur.com/ajsjp9E.png" alt="vantage.js" />
</p>
