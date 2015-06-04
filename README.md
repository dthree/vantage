
# Vantage

Same application. Brand new point of view.

[<img src="https://travis-ci.org/dthree/vantage.svg" alt="Build Status" />](http://travis-ci.org/dthree/vantage)

    npm install vantage

Vantage provides a distributed, interactive command-line interface to your live Node application or web server.

####Doesn't commander.js do that?

Yes, and no. Inspired by and based on [commander.js](https://www.npmjs.com/package/commander), Vantage allows you to connect into and hop between running Node applications with an interactive prompt provided by [inquirer.js](https://www.npmjs.com/package/inquirer).

```bash
$ npm install vantage -g
$ vantage 127.0.0.1:80
$ Connecting to 127.0.0.1:80 using http...
$ Connected successfully.
myapp~$ 
myapp~$ debug on -v 7
Turned on debugging with verbosity to 7.
... live logging ...
... more logging ...
myapp~$ 
```

