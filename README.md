<p align="center">
  <img src="http://i.imgur.com/NyusmRJ.png" alt="vantage.js" />
</p>
<p align="center">
  <img src="https://travis-ci.org/dthree/vantage.svg" alt="Build Status" />
  <a href="https://gitter.im/dthree/vantage?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge">
    <img src="https://img.shields.io/badge/gitter-join%20chat-brightgreen.svg" alt="Gitter" />
  </a><br>
  <a href="https://www.npmjs.com/package/vantage">
    <img src="https://img.shields.io/npm/v/vantage.svg" alt="NPM Version" />
  </a>
  <a href="https://www.npmjs.com/package/vantage">
    <img src="https://img.shields.io/npm/dm/vantage.svg" alt="NPM Downloads" />
  </a>

</p>

<p align="center">
  <i>
  Important: Vantage has split into two applications.
  <br>
  <a href="https://github.com/dthree/vantage/tree/master/split.md">See details here.</a>
  </i>
</p>

<br>

Vantage is Node's first framework for building immersive CLI applications. Vantage opens the door to a new breed of rich, interactive CLI environments [such as this one](https://github.com/dthree/wat), with a simple but powerful API.

[Vantage-io](https://github.com/vantagejs/vantage-io) gives Vantage wings: as an extension of Vantage, it provides `CLI` + `SSH` + `REPL` for your live node app, giving a new perspective to your existing application not previously available.

<br>

## Contents

* [Introduction](#introduction)
* [Getting Started](#getting-started)
  - [Examples](#examples)
  - [Community](#community)
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
* [Extensions](#extensions)
  - [Creating an Extension](#creating-an-extension)
* [License](#license)
* [Footnotes](#footnotes)

## Introduction

Inspired by and based on [commander.js](https://www.npmjs.com/package/commander), Vantage is a framework for building immersive CLI applications built on an interactive prompt provided by [inquirer.js](https://www.npmjs.com/package/inquirer). Vantage launches Node into an isolated CLI environment and provides a suite of API commands and functionality including:

- Commander.js-flavored command creation, including optional, required and variadic commands and arguments; aliases; and negation options.
- Built-in help,
- Built-in tabbed auto-completion,
- Customizable command-specific auto-completion,
- Persistent command history,
- Prompts,
- Live delimiter control,
- Action-based event listeners

Vantage supports community extensions, which can empower Vantage to do such things as [auto-reloading commands](https://github.com/vantagejs/vantage-watch), [live command imports](https://github.com/vantagejs/vantage-use) or even supporting a [built-in REPL](https://github.com/vantagejs/vantage-repl).

## Getting Started

##### Community

- [Q&A? Join Gitter Chat](https://gitter.im/dthree/vantage?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
- [Projects Made with Vantage](https://github.com/vantagejs/awesome-vantagejs)
- [List of Vantage Extensions](https://github.com/vantagejs/awesome-vantagejs#extensions)

##### Quick Start

First, install `vantage` into your project:

```bash
$ npm install vantage --save
```

In your project, add in the following:

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
// "websvr~$" and show the Vantage prompt.
vantage
  .delimiter("myapp$")
  .show();
```
Run your project file. You Node app has become a CLI.

```bash
$ node server.js
myapp~$ 
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
    exit [options]    Exits instance of Vantage.
    foo               Outputs "bar".

websvr~$
```

That's the basic idea. Once you get the hang of it, read on to learn some of the fancier things Vantage can do.

## Methods

### .command(command, [description])

Adds a new command to your command line API. Returns a `Command` object, with the following chainable functions:

* [`.description(string)`](#commanddescriptionstring): Used in automated help for your command.
* [`.alias()`](#commandaliasstring): Gives an alias to execute the command with.
* [`.hidden()`](#commandhidden): Removes command from help menus.
* [`.option(string, [description])`](#commandoptionstring-description): Provides command options, as in `-f` or `--force`.
* [`.autocompletion(function(text, iteration, callback))`](#commandautocompletiontextiterationcallback): Command-specific tabbed auto-completion.
* [`.action(function(args, callback))`](#commandactionfunction): Function to execute when command is executed.

```js
vantage
  .command("foo")
  .description("Outputs 'bar'.")
  .alias('foosball')
  .action(function(args, callback) {
    this.log("bar");
    callback();
  });
```
The syntax is similar to `commander.js` with the exception of allowing nested sub-commands for grouping large APIs into manageable chunks.

```js
// Simple command with no arguments.
vantage.command("foo", "Description of foo.");

// Optional argument.
vantage.command("foo [bar]"); 

// Required argument.
vantage.command("foo <bar>"); 

// Variadic argument.
vantage.command("foo [bars...]"); 

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

#### .command.alias(string)

Provides an alias to the command. If the user enters the alias, the original command will be fired.

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

#### .command.autocompletion(text, iteration, callback)

Registers a custom tabbed autocompletion for this command. 

If a user has typed part of a registered command, the default auto-completion will fill in the rest of the command:

```bash
node~$ co
node~$ cook
```

However, after the user has fully typed the command `cook`, you can now implement command-specific auto-completion:

```bash
node~$ bake coo            # tab is pressed
node~$ bake cookies        # tab is pressed again
cake  cookies  pie
node~$ bake cookies 
```

This is implemented as follows:

```js
vantage
  .command("bake", "Bakes a meal.")
  .autocompletion(function(text, iteration, cb) {
    
    // The meals are all of the possible actions.
    var meals = ["cookies", "pie", "cake"];
    
    // The iteration is the count of how many times
    // the `tab` key was pressed in a row. You can
    // make multiple presses return all of the options
    // for the user's convenience. 
    if (iteration > 1) {

      // By returning an array of values, Vantage
      // will format them in a pretty fashion, as
      // in the example above.
      cb(void 0, meals);

    } else {

      // `this.match` is a helper function that will
      // return the closest auto-completion match.
      // Just makin' your job easier.
      var match = this.match(text, meals);
      
      if (match) {

        // If there is a good autocomplete, return
        // it in the callback (first param is reserved
        // for errors).
        cb(void 0, meals);
      } else {

        // If you don't want to do anything, just
        // return undefined.
        cb(void 0, void 0);
      }
    }
  })
  .action(...);
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
  .command('order pizza [type] [otherThings...]', 'Orders a type of food.')
  .option('-s, --size <size>', 'Size of pizza.')
  .option('-a, --anchovies', 'Include anchovies.')
  .option('-p, --pineapple', 'Include pineapple.')
  .option('-o', 'Include olives.')
  .option('-d, --delivery', 'Pizza should be delivered')
  .action(function(args, cb){
    this.log(args);
    cb();
  });
```
Args would be returned as follows:

```bash
$webapp~$ order pizza pepperoni some other args -pod --size "medium" --no-anchovies
{
  "type": "pepperoni",
  "otherThings": ["some", "other", "args"]
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

Any and all logging in `command.action` should be done through `this.log`, which behaves exactly like `console.log`. This ensures all output for your given Vantage session is piped back properly to your TTY, and so that logging does not interrupt what the user is typing in their prompt.

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

```js
vantage.command("destroy database").action(function(args, cb){
  var self = this;
  this.prompt({
    type: "confirm",
    name: "continue",
    default: false,
    message: "That sounds like a really bad idea. Continue?",
  }, function(result){
    if (!result.continue) {
      self.log("Good move.");
      cb();
    } else {
      self.log("Time to dust off that resume.");
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

##### session.delimiter(string)

You can change the prompt delimiter mid command through `this.delimiter`.

```js
vantage
  .command("delimiter <string>")
  .action(function(args, cb){
    this.delimiter(args.string);
    cb();
  });
```

```bash
websvr~$ delimiter unicornsvr~$
unicornsvr~$
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

Behaves exactly like `command.action`, where the function passed in is fired once when the user enters the given mode. Passed the same parameters as `command.action`: `args` and `callback`. `init` is helpful when one needs to set up the mode or inform the user of what is happening.

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

Similar to `command.action`, `mode.action` differs in that it is repeatedly called on each command the user types until the mode is exited. Instead of `args` passed as the first argument, the full `command` string the user typed is passed and it is expected that `mode.action` appropriately handles the command. Example given above.

### .delimiter(string)

Sets the prompt delimiter for the given Vantage instance.

```js
new Vantage().delimiter('unicorn-approved-app$');
```

```bash
~$ myglobalapp
unicorn-approved-app$ 
unicorn-approved-app$ exit -f
~$ 
```

### .banner(string)

Sets a banner for display when logging into a given Vantage server.

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

Attaches the TTY's CLI prompt to that given instance of Vantage. While useless for deployed servers, this is great for testing an application's functions mid-development.

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

This is useful when running clustered instances of your server, such as behind a reverse proxy, where every instance has a separate port that can only be accessed internally. In this way, you can hop into any running instance without having to remember a separate set of ports.

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

##### With Hapi.js

```js
var Hapi = require('hapi');
var Vantage = require('vantage');

var vantage = new Vantage();
var server = new Hapi.Server();

vantage.listen(server, 80);

server.start();
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

##### Socket.io client / server events

Vantage uses `socket.io` to handle all communication between instances. The following events map to the default `socket.io` events:

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

Vantage allows you execute your API commands from javascript synchronously, using either callbacks or promises.

### .connect(server, port, [options or callback], [callback])

Connects to another instance of Vantage. Returns callback or promise.

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

5. By then entering the `repl` command, I entered a special REPL "mode" where I can access the raw javascript and objects in my application, while it's running. This is the equivalent of running `$ node` in your terminal, except it is in the context of your live application!

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
