<p align="center">
  <img src="http://i.imgur.com/NyusmRJ.png" alt="vantage" />
</p>
<p align="center">
  <img src="https://travis-ci.org/dthree/vantage.svg" alt="Build Status" />
  <a href="https://gitter.im/dthree/vantage?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge">
    <img src="https://img.shields.io/badge/gitter-join%20chat-brightgreen.svg" alt="Gitter" />
  </a>
  <a href="https://www.npmjs.com/package/vantage">
    <img src="https://img.shields.io/npm/v/vantage.svg" alt="NPM Version" />
  </a>
</p>


<br>

`Vantage` = `CLI` + `SSH` + `REPL` for your live node app. In one line:

`require("vantage")().listen(4000);`

<br>

<p align="center">
  <img src="http://i.imgur.com/ZwAxqv4.gif" alt="vantage.js demo" />
</p>

* [What just happened?](#er-that-gif-im-so-confused)
* [That's voodoo magic: show me the code](https://github.com/dthree/vantage/tree/master/examples/spiffy-gif/)
* [Tell me more](#contents)

## Contents

* [Introduction](#introduction)
* [Getting Started](#getting-started)
  - [Tour](#tour)
  - [Examples](#examples)
  - [Community](#community)
  - [Quick Start](#quick-start)
* [API](#api)
  - [.listen](#listenapp-options-or-callback-callback)
  - [.banner](#bannerstring)
  - [firewall](#firewall)
  - [authentication](#authentication)
* [Events](#events)
* [Automation](#automation)
* [Extensions](#extensions)
* [License](#license)
* [Footnotes](#footnotes)

## Introduction

Vantage gives you a new perspective into your live node application not previously available.

An extension of [Vorpal](https://github.com/dthree/vorpal), Vantage turns your live Node app into a immersive CLI. Accessible remotely or locally, Vantage lets you build your own API for your application and import community extensions, introducing a new means of live diagnostics and activity for your `dev` and `prod` environments.

- First-class CLI: tab completion, history, you name it.
- Build your own API with the familiar syntax of `commander.js`.
- SSH-like client / server setup for remote access to your live Node app.
- Production-ready, with authentication middleware and a basic firewall.
- Built-in REPL.

Unlike any other REPL or CLI module, Vantage allows you to remotely connect to your live app and access the CLI transparently, exactly as you would in an SSH session. Vantage can connect through an unlimited number of live Node instances across multiple machines, piping commands and information to and from your local terminal. 

Made with :heart: by [@dthree](https://github.com/dthree).

## Notice

This is now an [OPEN Open Source](http://openopensource.org/) project. I am not able to invest a significant amount of time into maintaining Vantage and so am looking for volunteers who would like to be active maintainers of the project. If you are interested, shoot me a note.

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
- [Hapi.js with Vantage](https://github.com/dthree/vantage/tree/master/examples/hapi)
- [Using the Firewall](https://github.com/dthree/vantage/tree/master/examples/firewall)

##### Community

- [Q&A? Join Gitter Chat](https://gitter.im/dthree/vantage?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
- [List of Extensions](https://github.com/dthree/vorpaljs/awesome-vorpal)

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
    exit [options]    Exits instance of Vantage.
    use <module>      Installs a vantage extension in realtime.
    vantage [server]  Connects to another application running vantage.
    foo               Outputs "bar".

websvr~$
```

That's the basic idea. Once you get the hang of it, read on to learn some of the fancier things Vantage can do.

## API

Vantage is an **extension** of [Vorpal](https://github.com/dthree/vorpal), and so inherits all of its properties and methods. For all command creation and CLI syntax, refer to Vorpal's API.

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

Allows a particular address / subnet to connect to Vantage. Returns `vantage.firewall`. If no arguments are passed, returns the currently-applied policy.

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

Vantage supports authentication strategies as middleware. It comes with a default [Basic Authentication module](https://github.com/dthree/vantage-auth-basic).

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

If no `vantage.auth` function is declared, your app will not require authentication. As a security measure, if your `NODE_ENV` environment variable is not set to "development" and there is no authentication, Vantage will disallow remote connections. To permit remote connections without authentication, simply set your `NODE_ENV` to "development".

##### Building Authentication Strategies

You can publish your own custom authentication strategies for Vantage.js as its own Node module.

*I am currently looking to team up with a rocket scientist like you to build a pam-based authentication strategy for Vantage. If you are interested, send me a note!*

The format for publishing a strategy is simple:

```js

module.exports = function(vantage, options) {

  // The Vantage instance is exposed through
  // the `vantage` parameter. `options` exposes
  // options passed in by the strategy's user, and
  // is defined by you.

  // This is where you can persist the log on state of 
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

## Extensions

Just like Vorpal, Vantage supports extensions. Creating extensions is simple and is covered in Vorpal's documentation.

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

<p align="center" width="128px" height="128px">
  <img src="http://i.imgur.com/ajsjp9E.png" alt="vantage.js" />
</p>

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/dthree/vantage/trend.png)](https://bitdeli.com/free "Bitdeli Badge")
