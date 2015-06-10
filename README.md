
# Vantage

[<img src="https://travis-ci.org/dthree/vantage.svg" alt="Build Status" />](http://travis-ci.org/dthree/vantage)

Your existing application. A brand new point of view.

    npm install vantage -g

Vantage provides a distributed, interactive command-line interface to your live Node application or web server.

Inspired by and based on [commander.js](https://www.npmjs.com/package/commander), Vantage allows you to connect into and hop between running Node applications with an interactive prompt provided by [inquirer.js](https://www.npmjs.com/package/inquirer), giving a real-time perspective of your application you otherwise haven't had.

#### Contents

* [Getting Started](#getting-started)
  - [Tutorial](#tutorial)
  - [Examples](#examples)
  - [Quick Start](#quick-start)
* [Methods](#methods)
  - [.command](#commandcommand-description)
    - [.description](#commandcommand-description)
    - [.option](#option-syntax)
    - [.action](#action-syntax)
  - [.delimiter](#delimiterstring)
  - [.banner](#bannerstring)
  - [.show](#show)
  - [.listen](#listenapp-options)
    - [as standalone server](#vantage-as-a-standalone-web-server)
    - [with koa.js](#with-koajs)
    - [with express.js](#with-expressjs)
* [Events](#events)
* [Automation](#automation)
* [Firewall](#firewall)
* [Authentication](#authentication)
* [Extensions](#extensions)
* [Roadmap](#roadmap)
* [License](#license)

## Getting Started

By using Vantage, you take your existing application and turn it into a first-class citizen CLI, including:

- Built-in and automated help.
- Command history (up / down arrows).
- Tabbed command auto-completion.
- Support for API plugins.
- Familiar API based on `commander.js`.

Unlike other REPL or CLI modules, Vantage allows you to remotely connect to your live application and access this CLI without interrupting the application. Like an SSH session, Vantage can connect through an unlimited number of running Node instances across multiple machines, piping commands and information to and from your local machine. 

```bash
$ npm install vantage -g
$ vantage 10.40.80.20:80
$ Connecting to 10.40.80.20:80 using http...
myapp~$ 
myapp~$ debug on -v 7
Turned on debugging with verbosity to 7.
... [live logging] ...
...
...
myapp~$ debug off
myapp~$ vantage 10.40.80.40:443 --ssl
$ Connecting to 10.40.80.20:443 using https...
myotherapp~$ 
myotherapp~$ rebuild indexes
Successfully rebuilt application indexes.
myotherapp~$
myotherapp~$ exit
myapp~$ exit
$
```

##### Tutorial

[This Vantage Tutorial](https://github.com/dthree/vantage/tree/master/examples/tutorial) will give you a live tour of Vantage's features.

```bash
git clone git://github.com/dthree/vantage.git vantage
cd ./vantage
npm install
node ./examples/tutorial/tutorial.js
```
##### Examples

  *Coming soon...*

- Standalone Vantage Server
- Koa.js with Vantage
- Express with Vantage
- Using an extension - make a REPL client
- Making an extension
- Using Automation
- Using the Vantage Firewall

##### Quick Start

Add the following to a file named `server.js`.

```js
var Vantage = require('vantage');
var server = new Vantage();

server
  .command('foo')
  .description('Outputs "bar".')
  .action(function(args, cb) {
    console.log('bar');
    cb();
  });
  
server
  .delimiter('webapp~$')
  .listen(80)
  .show();
```

You can now run it directly. The `server.show()` command enables the prompt from the terminal that started the application:

```bash
$ node server.js
webapp~$ 
```

With `server.listen(80)` given above, you can remotely connect to the application from another terminal:

```bash
$ vantage 80
$ Connecting to 127.0.0.1:80 using http...
$ Connected successfully.
webapp~$ 
```
You can now execute your application's CLI commands remotely, and the `stdout` from the application will pipe to your terminal:

```bash
webapp~$
webapp~$ foo
bar
webapp~$
```

A built-in help lists all available commands:

```bash
webapp~$ help

  Commands
  
    help [command]    Provides help for a given command.
    exit [options]    Exists instance of Vantage.
    vantage [server]  Connects to another application running vantage.
    foo               Outputs "bar".

webapp~$
```

## Methods

### .command(command, [description])

Adds a new command to your command line API. Returns a `Command` object, with the following chainable functions:

- `.description(string)`: Used in automated help for your command.
- `.option(string, [description])`: Provides command options, as in `-f` or `--force`.
- `.action(function)`: Function to execute when command is executed.

#### Command Syntax

The syntax is similar to `commander.js` with the exception of allowing nested sub-commands for grouping large APIs into managable chunks. Examples:

```js
vantage.command('foo'); // Simple command with no arguments.
vantage.command('foo [bar]'); // Optional argument.
vantage.command('foo <bar>'); // Required argument.

// Example of nested subcommands:
vantage.command('farm animals');
vantage.command('farm tools');
vantage.command('farm feed [animal]');
vantage.command('farm with farmer brown and reflect on <subject>');
```
##### Sub-Commands

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
#### Option Syntax

You can provide both short and long versions of an option. Examples:

```js
vantage.command(...).option('-f, --force', 'Force file overwrite.');
vantage.command(...).option('-a, --amount <coffee>', 'Number of cups of coffee.');
vantage.command(...).option('-v, --verbosity [level]', 'Sets verbosity level.');
vantage.command(...).option('-A', 'Does amazing things.');
vantage.command(...).option('--amazing', 'Does amazing things');
```

#### Action Syntax

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
#### Prompting

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

### .listen(app, [options])

Starts Vantage as a server. 

#### Vantage as a standalone web server

If you just want it to listen on a port independent of your web application, simply pass in the port and Vantage will spawn a new HTTP server.

```js
var vantage = new Vantage();
vantage.listen(80);
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

You can pass detailed options to your web server with the second argument in place of the port. These options are the same options you would pass into your web server, with two exceptions:

- `options.port`: Tells vantage what port to listen on.
- `options.ssl`: A boolean that tells Vantage whether to spawn an HTTP or HTTPs server.

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

Vantage extends `EventEmitter.prototype`. Simply use `vantage.on('event', fn)` and `vantage.emit('event', data')`. The following events are supported:

##### Socket.IO client / server events

Vantage uses `Socket.IO` in to handle all communication between instances. The following events map to the default `Socket.IO` events:

- `client_connect`: Maps to `connect` for `socket.io-client`.

- `client_connect_error`: Maps to `connect_error` for `socket.io-client`.

- `client_error`: Maps to `error` for `socket.io-client`.

- `client_disconnect`: Maps to `disconnect` for `socket.io-client`.

- `server_connection`: Maps to `connection` for `socket.io`.

- `server_disconnect`: Maps to `disconnect` for `socket.io`.

##### Vantage events

- `client_keypress`: Fires on keypress on local client terminal.

- `client_prompt_submit`: Fires when the CLI prompt has been submitted with a command, including ''.

- `client_command_executed`: Fires at the client once the command has been received back as executed.

- `client_command_error`: Fires at the client if a command comes back with an error thrown.

- `server_command_received`: Fires at the end-server actually executing a command receives the command.

- `server_command_executed`: Fires at the end-server once the command has successfully executed.

- `server_command_error`: Fires at the end-server if the command has thrown an error.

## Automation

Vantage allows you execute your API commands from javascript synchronously, using either callbacks or Promises.

### .connect(server, port, [options], [callback])

Connects to another instance of Vantage. Returns callback or Promise.

```js
vantage.connect('127.0.0.1', 8001).then(function(data){
  // ... 
}).catch(function(err){
  console.log('Error connecting: ' + err);
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

##### Known Issues

- On unexpected logging, prompt does not redraw.

## License

MIT
