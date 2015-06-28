# Spiffy README.md GIF

These are the source files that were used to produce the GIF on vantage's README.md. Probably not the best place to get started, but if you are curious or don't believe that vantage did those things, dive in.
 
### Running the files

First install `vantage` with `dev-dependencies` included:

```bash
$ git clone git://github.com/dthree/vantage.git vantage
$ cd ./vantage
$ npm install
```

Then you'll need to run two instances of `vantage` in two separate terminals:

```bash
$ node ./examples/spiffy-gif/dbsvr.js
```

```bash
$ node ./examples/spiffy-gif/websvr.js
```

Voila. Now just do what the GIF does (starting in the `websvr.js` instance).
