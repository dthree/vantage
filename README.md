
# Vantage

[<img src="https://travis-ci.org/dthree/vantage.svg" alt="Build Status" />](http://travis-ci.org/dthree/vantage)

Same application. Brand new point of view.

    npm install vantage -g

Vantage provides a distributed, interactive command-line interface to your live Node application or web server.

####Doesn't commander.js do that?

Yes, and no. Inspired by and based on [commander.js](https://www.npmjs.com/package/commander), Vantage allows you to connect into and hop between running Node applications with an interactive prompt provided by [inquirer.js](https://www.npmjs.com/package/inquirer), giving a real-time perspective of your application you otherwise haven't had.

The CLI includes built-in help, command history and tabbed auto-completion.

```bash
$ npm install vantage -g
$ vantage 127.0.0.1:80
$ Connecting to 127.0.0.1:80 using http...
$ Connected successfully.
myapp~$ 
myapp~$ debug on -v 7
Turned on debugging with verbosity to 7.
... [live logging] ...
...
...
myapp~$ 
```

####Contents

* Getting Started
* Basic Commands
  - command
    - description
    - alias
    - action
      - prompt
  - delimiter
  - banner
  - listen
  - prompt
  - exec
  - pipe
  - use
* Automation
* Firewall
* Authentication
* Extensions

##Getting Started

Setting up a basic application:

```js
// server.js
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
  .prompt();
```

You can now run it directly. The `server.prompt()` command enables the prompt from the terminal that started the application:

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

## Basic Commands

###.command(command, [description])

Adds a new command to your command line API. Returns a `Command` object, with the following chainable functions:

- `.description(string)`: Used in automated help for your command.
- `.option(string, [description])`: Provides command options, as in `-f` or `--force`.
- `.action(function)`: Function to execute when command is executed.

####Command Syntax

The syntax is similar to `commander.js` with the exception of allowing nested sub-commands for grouping large APIs into managable chunks. Examples:

```js
vantage.command('foo'); // Simple command with no arguments.
vantage.command('foo [bar]'); // Optional argument.
vantage.command('foo <bar>'); // Required argument.

// Example of nested subcommands:
vantage.command('farm animals');
vantage.command('farm tools');
vantage.command('farm feed [animal]');
vantage.command('farm sit with farmer brown and reflect on <subject>');
```
#####Sub-Commands

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
  
    farm see *          1 sub-command.
    
```
####Option Syntax

You can provide both short and long versions of an option. Examples:

```js
vantage.command(...).option('-f, --force', 'Force file overwrite.');
vantage.command(...).option('-a, --amount <coffee>', 'Number of cups of coffee.');
vantage.command(...).option('-v, --verbosity [level]', 'Sets verbosity level.');
vantage.command(...).option('-A', 'Does amazing things.');
vantage.command(...).option('--amazing', 'Does amazing things');
```

####Action Syntax

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
####Prompting

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

###.delimiter(string)

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

###.banner(string)

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

###.prompt()

Starts a Vantage CLI prompt from the local terminal that started the application. While useless for deployed servers, this is great for testing an application's functions mid development.

```js
// websvr.js

// ... (your web server code)

vantage
  .delimiter('websvr~$')
  .prompt();
  
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

###.listen(app, [options])

Listen starts Vantage as a server. If you just want 




------

... Note: this is a live document and is I/P being edited.
