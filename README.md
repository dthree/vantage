[<img src="https://travis-ci.org/dthree/repl-quick.svg" alt="Build Status" />](http://travis-ci.org/dthree/repl-quick)

# REPL-Quick

Simple utility to jump into a REPL session, aborting with a callback or a promise.

    $ npm install repl-quick

## Quick Start

```javascript
var rq = require('repl-quick');

rq({ /* ... options */ }, function(){
	
	// ... fires after user aborts from REPL.
});     
```

## Options

- **prompt**: Prompt provided in the REPL. Defaults to `>`.
- **input**: Standard REPL input. Defaults to `process.stdin`.
- **output**: Standard REPL input. Defaults to `process.stdout`.
- **context**: Dictionary of strings that map to `repl.context`.

## Examples

Used with all options:

```javascript
require('repl-quick')({
	prompt: 'my-little-repl~$ ',
	input: process.stdin,
	output: process.stdout,
	context: {
		"app": my.obscure.path.to.app,
		"calc": my.obscure.path.to.calc,
	},
}, callback);
```

Or as a promise:

```javascript
app.doSomething()
	.then(function(){
		return require('repl-quick')();
	})
```

