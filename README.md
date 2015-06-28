
# Vantage

[<img src="https://travis-ci.org/dthree/vantage.svg" alt="Build Status" />](http://travis-ci.org/dthree/vantage)

Your existing application. A brand-new point of view.

    npm install -g vantage

Vantage provides a foundation for adding a custom, interactive CLI to your live Node application. Accessible locally or remotely, it gives a real-time perspective from inside your application. Fully customizable and extensible, you can easily add any feature you need to develop, debug and gain insight in your development or production application. 

##### Node is awesome:

![vantage.js demo](http://i.imgur.com/ZwAxqv4.gif)

* [What just happened?](#er-that-gif-im-so-confused)
* [That's voodoo magic: show me the source](https://github.com/dthree/vantage/tree/master/examples/spiffy-gif/)
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
* [Roadmap](#roadmap)
* [License](#license)
* [Footnotes](#footnotes)

## Introduction

Inspired by and based on [commander.js](https://www.npmjs.com/package/commander), Vantage allows you to connect into and hop between running Node applications with an interactive prompt provided by [inquirer.js](https://www.npmjs.com/package/inquirer), introducing the possibility of live actions and diagnostics for your development and production environments.

- A first-class CLI interface including tab-completion, command history and built-in help.
- You build your own API with the familiar syntax of `commander.js`.
- Build and use community-based extensions for suites of commands.
- Import community extensions on the fly for live requirements.

Unlike other REPL or CLI modules, Vantage allows you to remotely connect to your live application and access this CLI without interrupting the application. Like an SSH session, Vantage can connect through an unlimited number of running Node instances across multiple machines, piping commands and information to and from your local machine. 

## Getting Started

##### Tutorial

[This Vantage Tutorial](https://github.com/dthree/vantage/tree/master/examples/tutorial) will give you a live tour of Vantage's features.

```bash
$ npm install -g vantage
$ vantage tutorial
```

##### Examples

*Non-linked examples are in progress.*

- [Standalone Vantage Server](https://github.com/dthree/vantage/tree/master/examples/server)
- [Koa.js with Vantage](https://github.com/dthree/vantage/tree/master/examples/koa)
- [Express.js with Vantage](https://github.com/dthree/vantage/tree/master/examples/express)
- [Using the "mode" command to make a simple REPL client](https://github.com/dthree/vantage/tree/master/examples/mode)
- Making an extension
- Using Automation
- [Firewall](https://github.com/dthree/vantage/tree/master/examples/firewall)

##### Quick Start

First, install `vantage` globally:

```bash
$ npm install -g vantage
```

Now, add the following to a file named `server.js`.

```js
// Create a new instance of vantage.
var vantage = require('vantage')();

// Add the command `foo`, which 
// outputs "bar".
vantage
  .command("foo")
  .description("Outputs 'bar'.")
  .action(function(args, cb) {
    console.log("bar");
    cb();
  });
  
// Name your prompt delimiter 
// "webapp~$", listen on port 80 
// and show the vantage prompt.
vantage
  .delimiter('webapp~$')
  .listen(80)
  .show();
```
Run `server.js`. You Node app has become a CLI.

```bash
$ node server.js
webapp~$ 
```

Open another terminal window. Because `vantage` is listening on port 80, you can remotely connect to it:

```bash
$ vantage 80
$ Connecting to 127.0.0.1:80 using http...
$ Connected successfully.
webapp~$ 
```

Since you created the `foo` command, let's try it:

```bash
webapp~$ foo
bar
webapp~$
```

Even though you're remotely connected to `server.js`, `vantage` sends the responses back to you.

Type `help` to see `vantage`'s built in commands in addition to the one you added.

```bash
webapp~$ help

  Commands
  
    help [command]    Provides help for a given command.
    exit [options]    Exists instance of Vantage.
    vantage [server]  Connects to another application running vantage.
    foo               Outputs "bar".

webapp~$
```

That's the basic idea. Once you get the hang of it, read on to learn some of the fancier things `vantage` can do.

## Methods

### .command(command, [description])

Adds a new command to your command line API. Returns a `Command` object, with the following chainable functions:

* [`.description(string)`](#commanddescriptionstring): Used in automated help for your command.
* [`.option(string, [description])`](#commandoptionstring-description): Provides command options, as in `-f` or `--force`.
* [`.action(function)`](#commandactionfunction): Function to execute when command is executed.
  - [`.prompt(object, [callback])`](#promptobject-callback): Exposes `inquirer`'s `prompt` function.

The syntax is similar to `commander.js` with the exception of allowing nested sub-commands for grouping large APIs into managable chunks. Examples:

```js
vantage.command('foo', 'Description of foo.'); // Simple command with no arguments.
vantage.command('foo [bar]'); // Optional argument.
vantage.command('foo <bar>'); // Required argument.

// Example of nested subcommands:
vantage.command('farm animals');
vantage.command('farm tools');
vantage.command('farm feed [animal]');
vantage.command('farm with farmer brown and reflect on <subject>');
```
Descriptions can optionally be passed in as the second parameter, which are used to build the automated help feature.

##### Sub-commands

When displaying the help menu, sub-commands will be grouped separately:

```bash
webapp~$ help

  Commands: ( ... )
  
  Command Groups:
  
    farm *            4 sub-commands.

```

Entering `farm` or `farm --help` would then drill down on the commands:

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
  .command('foo')
  .description('outputs bar')
  // ...
```

#### .command.option(string, [description])

You can provide both short and long versions of an option. Examples:

```js
vantage.command(...).option('-f, --force', 'Force file overwrite.');
vantage.command(...).option('-a, --amount <coffee>', 'Number of cups of coffee.');
vantage.command(...).option('-v, --verbosity [level]', 'Sets verbosity level.');
vantage.command(...).option('-A', 'Does amazing things.');
vantage.command(...).option('--amazing', 'Does amazing things');
```

#### .command.action(function)

`command.action` passes in an `arguments` object and `callback`.

Given the following command --

```js
vantage
  .command('order pizza [type]', 'Orders a type of food.')
  .option('-s, --size <size>', 'Size of pizza.')
  .option('-a, --anchovies', 'Include anchovies.')
  .option('-p, --pineapple', 'Include pineapples.')
  .option('-o', 'Include olives.')
  .option('-d, --delivery', 'Pizza should be delivered')
  .action(function(args, cb){
    console.log(args);
    cb();
  });
```
-- args would be returned as follows:

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

Actions are executed async and must either call the passed `callback` upon completion or return a `Promise`.

```js
// As a callback:
command(...).action(function(args, cb){
  doSomethingAsync(function(results){
    console.log(results);
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
      reject('Better luck next time');
    }
  });
});

// Or as a pre-packaged promise of your app:
command(...).action(function(args, cb){
  return app.promisedAction(args.action);
});
```
#### .prompt(object, [callback])

Vantage supports mid-command prompting. You can make full use of [inquirer.js](https://www.npmjs.com/package/inquirer)'s `prompt` function, which is exposed through `vantage.prompt`.

Regardless of a direct vantage connection or one proxying your request through ten hops, `vantage.prompt` will send the remote prompt request to your local client and pipe response back to the remote application.

```js
vantage.command('destroy database').action(function(args, cb){
  this.prompt({
    type: "confirm",
    name: "continue",
    default: false,
    message: "That sounds like a really bad idea. Continue?",
  }, function(result){
    if (!result.continue) {
      console.log('Good move.');
      cb();
    } else {
      console.log('Time to dust off that resume.');
      app.destroyDatabase(cb);
    }
  });
});
```
Example in use:
```bash
webapp~$ destroy database
? That sounds like a really bad idea. Continue? y/N: N
Good move.
webapp~$
```

### .mode(command, [description])

Mode is a special type of `command` that brings the user into a given `mode`, wherein regular vantage commands are ignored and the full command strings are interpreted literally by the `mode.action` function. This will continue until the user exits the mode by typing `exit`.

```js
vantage
  .mode('repl')
  .description('Enters the user into a REPL session.')
  .delimiter('repl:')
  .action(function(command, callback) {
    console.log(eval(command));
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

This will add on an additional delimiter string to one's vantage prompt upon entering the mode, so the user can differentiate what state he is in.

```js
vantage
  .mode('repl')
  .delimiter('you are in repl>')
  .action(function(command, callback) {
    console.log(eval(command));
  });
```

```bash
node~$ 
node~$ repl
node~$ you are in repl>  
node~$ you are in repl> exit
node~$ 
```
#### .mode.init(function)

Behaves exactly like `command.action`, wherein the passed in function is fired once when the user enters the given mode. Passed the same parameters as `command.action`: `args` and `callback`. `init` is helpful when one needs to set up the mode or inform the user of what is happening.

```js
vantage
  .mode('sql')
  .delimiter('sql:')
  .init(function(args, callback){
    console.log('Welcome to SQL mode.\nYou can now directly enter arbitrary SQL commands. To exit, type `exit`.');
    callback();
  })
  .action(function(command, callback) {
    app.query(command, function(res){
      console.log(res);
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

Similar to `command.action`, `mode.action` differs in that it is repeatedly called on each command the user types until the mode is exited. Instead of `args` passed as the first argument, the full `command` string the user typed is passed and it is expected that `mode.action` appropriately handle the command. An example is given just above.

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

Starts a Vantage CLI prompt from the local terminal that started the application. While useless for deployed servers, this is great for testing an application's functions mid development.

```js
// websvr.js

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

### .listen(app, [options or callback], [callback])

Starts Vantage as a server. 

#### Vantage as a standalone web server

If you just want it to listen on a port independent of your web application, simply pass in the port and Vantage will spawn a new HTTP server. Every time a client connects to vantage, the connection callback will be thrown and include the `socket.io` connection object.

```js
var vantage = new Vantage();
vantage.listen(80, function(socket){
  console.log('Accepted a connection.')
});
```

#### Vantage with an existing web server

If you want Vantage to listen on the same port as your web application, you can use Vantage's `listen` function in place of your existing web server's `listen` function.

This is usefull when running clustered instances of your server, such as behind a reverse proxy, where every instance has a separate port that can only be accessed internally. In this way, you can hop into any running instance without having to remember a separate set of ports.

**Warning: If you tag on to a public-facing port, such as 80, ensure you have proper security settings in place to prevent evil people from getting into your Vantage API.**\*

\* *Unless your Vantage server only displays a [Star Wars asciimation](http://www.asciimation.co.nz/) upon login.*

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
vantage.exec('vantage 8001').then(function(data){
  return vantage.exec('roll dough');
}).then(function(data){
  return vantage.exec('add cheese');
}).then(function(data){
  return vantage.exec('add pepperoni');
}).then(function(data){
  return vantage.exec('shape crust');
}).then(function(data){
  return vantage.exec('insert into oven');
}).then(function(data){
  return vantage.exec('wait 480000');
}).then(function(data){
  return vantage.exec('remove from oven');
}).then(function(data){
  return vantage.exec('enjoy');
}).catch(function(err){
  console.log('Error baking pizza: ' + err);
  app.orderOut();
});

// Using callbacks:
vantage.exec('vantage 8001', function(err, data) {
  if (!err) {
    vantage.exec('bake pizza', function(err, pizza){
      if (!err) {
        app.eat(pizza);
      }
    });
  }
});
```

### .pipe(function)

Captures all `stdout` piped through Vantage and passes it through a custom function. The string returned from the function is then logged.

```js
var onStdout = function(stdout) {
  app.writeToLog(stdout);
  return '';
}

vantage
  .pipe(onStdout)
  .connect('127.0.0.1', 80, {});
```

## Firewall

If your Vantage server is listening on a public-facing web port such as 80 or 443, your organization's firewall is not going to help you. This is a barebones IP firewall for limiting connections down to your internal subnets. For sensitive applications, this obviously does not replace authentication.

### .firewall.policy(string)

Sets the default policy for the firewall to either `ACCEPT` or `REJECT`. Any request that does not match a rule will fall back to this policy. Returns `vantage.firewall`.

**Defaults to `ACCEPT`.** 

```js
// This will reject all remote connections.
vantage.firewall.policy('REJECT');
```

### .firewall.accept(address, [subnet])

Allows a particular address / subnet to connect to Vantage. Returns `vantage.firewall`. If no arguments are passed, returns the currently applied policiy.

```js
vantage.firewall
  .policy('REJECT')
  .accept('10.0.0.0/8')
  .accept('192.168.0.0', 24);

console.log(vantage.firewall.policy()) // -> REJECT  
```

### .firewall.reject(address, [subnet])

Denies access to a particular address / subnet. Returns `vantage.firewall`.

```js
vantage.firewall
  .policy('ACCEPT')
  .reject('64.0.0.0', 8)
  .reject('192.168.0.0/16');
```
### .firewall.rules()

Returns an array of applied rules.

```js
console.log(vantage.firewall.rules());
// -> [{ ip: '64.0.0.0', subnet: 8, rule: 'REJECT' }]
```

### .firewall.reset()

Reverts `vantage.firewall` to an `ACCEPT` policy and erases all rules.

## Authentication

*Vantage does not yet support authentication.*

The idea is to allow separate Node.js modules as authentication middleware. Something like this:

```js
var pam = require('vantage-pam');
vantage.auth(pam);
```

This will then be able to support multiple authentication strategies based on systems or preferences. Feel free to submit a pull request if you are able to assist in getting this done.

## Extensions

Vantage supports command extensions and this is the primary reason for supporting sub-commands. For example, someone could create a suite of server diagnostic commands under the namespace `system` and publish it as `vantage-system`:

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

### .use(middleware)

Imports an array of vantage commands and registers them.

To use your module must expose an array of commands listed as objects:

```js
var status = {
  command: 'system status',
  description: 'lists a summary of system resources',
  options: [
    ['-p, --pretty', 'Displays them in a pretty fashion.']
  ],
  action: function(args, cb) {
    // do things...
    cb();
  }
}

module.exports = [status, /* ... more commands */];
```
```bash
npm install vantage-system
```
```js
var system = require('vantage-system');
vantage.use(system);
```

## Roadmap

- Aliases
- Variadic arguments
- Authentication
- Multiple-session support
- Promise polyfill

##### Supported Versions

The support is limited to the latest versions of Node as I use promises, however as soon as I implement a polyfill for promises, this support can be increased.

* `node`: `>=0.11.16`
* `iojs`: `>=1.0.0`

## License

MIT

## Footnotes

##### Er, that GIF... I'm so confused...

That's okay. Here's what happened:

1. In my terminal, I started a local Node web server:

```js
$ node websvr.js
```

Normally, you would simply see what you logged, and would have no interaction with Node. Instead, `vantage` gave us a prompt:

```bash
websvr~$ 
```

2. I typed `help`, which gave me a list of all of `vantage`'s built-in commands as well as commands I added.

3. In my `websvr.js`, I gave `vantage` a command that would turn on logging *only for* web requests. By logging domains of activity, this assists productivity in debugging. To run this, I typed `debug web`, and it started logging all web requests.

4. I then typed `debug off`, which disabled log output. 

5. By then entering the `repl` command, I entered a special REPL "mode" where I can access the raw javascript and objects in my application, while it's running. This is the equivilant of running `$ node` in your terminal, except it is in the context of your live application!

6. Satisfied with `repl` mode, I exited out of it with the `exit` command.

7. So that's nice, you can access the local Node instance in your terminal. But what about remote or daemonized applications? By using the built-in `vantage` command, I remotely connect to my Node database API listening on port `5001`, by running `vantage 127.0.0.1:5001`. 

8. Just like SSH, I'm now "in" the new instance, and my prompt changed to `dbsvr~$`.

9. This server supports another `vantage` mode I made. By typing `sql`, I enter "sql mode". Using this, I typed an arbitrary SQL command and it connected to my database and executed it. When done, I entered `exit`.

10. I felt like checking out the latest trend on Hacker News (from my DB API, of course). I typed `help` and was disappointed to find there was no `hacker-news` API command.

11. Fortunately, someone made an extension for that - an NPM module called `vantage-hacker-news`. To download it and import the commands into `vantage` in realtime, I typed `use vantage-hacker-news`.

12. With this command, `vantage` did a temporary `npm install` on the module and loaded it into the application's memory. By typing `help` again, I can see I now have a new `vantage` command registered: `hacker-news`!

13. I used the command: `hacker-news --length 3`, and this showed me the top 3 items trending on Hacker News. One of them was obviously an article on the Node event loop, because Node is awesome.

14. Satisfied, I typed `exit`, which brought me back to my web server.

15. I then typed `exit -f` (for `--force`) to actually quit the web server, which was running locally in my terminal.

* [Ah. Show me the GIF again](#node-is-awesome)
* [I get it, I get it. *Tell me more*](#contents)
