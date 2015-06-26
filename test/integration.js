var assert = require("assert")
  , should = require('should')
  , Vantage = require('../')
  , subnet = require('insubnet')
  , util = require('./util/util')
  ;

var vantage = new Vantage();
var _all = '';
var _stdout = '';
var _excess = '';

var onStdout = function(str) {
  _stdout += str;
  _all += str;
}

var stdout = function() {
  var out = _stdout;
  _stdout = '';
  return String(out || '');
}

describe('integration tests:', function() {

  describe('vantage server:', function() {

    before('should start on three ports', function(done){
      this.timeout(8000);
      util.spawn({
        ports: [8040, 8041, 8042],
       }, function(err){
        (err === undefined).should.be.true;
        setTimeout(function(){
          done(err);
        }, 3000)
      });
    });

    after('cleanup', function(done) {
      util.kill('all', function(){
        //console.log(_all);
        //console.log(_excess);
        done();
      });
    });

    afterEach(function(){
      _excess += stdout(); 
    });

    var exec = function(cmd, done, cb) {
      vantage.exec(cmd).then(function(){
        cb();
      }).catch(function(err){
        console.log(err);
        done(err);
      });
    }

    it('should accept a vantage connection with a callback', function(done) {
      vantage
        .pipe(onStdout)
        .connect('127.0.0.1', '8040', {}, function(){
          stdout();
          done();
        });
    });

    it('exit the connection with a callback', function(done) {
      vantage.exec('exit', function() {
        stdout();
        done();
      });
    });

    it('should accept a vantage connection callback and no options', function(done) {
      vantage
        .pipe(onStdout)
        .connect('127.0.0.1', '8040', function(){
          vantage.exec('exit', function() {
            stdout();
            done();
          });
        });
    });

    it('should accept a vantage connection with a promise', function(done) {
      vantage
        .pipe(onStdout)
        .connect('127.0.0.1', '8040', {}).then(function(){
          stdout();
          done();
        }).catch(function(err){
          console.log(err);
          done(err);
        });
    });

    describe('promise execution', function(){

      it('should not fail', function(done) {
        vantage.exec('fail me not').then(function(data){
          true.should.be.true; done();
        }).catch(function(err) {
          true.should.not.be.true; done(err);
        });
      });
      
      it('should fail', function(done) {
        vantage.exec('fail me yes').then(function(data){
          true.should.not.be.true; done();
        }).catch(function(err) {
          true.should.be.true; done();
        });
      });

    });

    describe('command execution', function(){

      it('should execute a simple command', function(done) {
        exec('fuzzy', done, function(err) {
          stdout().should.equal('wuzzy');
          done(err);
        });
      });

      it('should execute help', function(done) {
        exec('help', done, function(err) {
          String(stdout()).toLowerCase().should.containEql('help');
          done(err);
        });
      });

      it('should chain two async commands', function(done) {
        vantage.exec('foo').then(function() {
          stdout().should.equal('bar');
          return vantage.exec('fuzzy');
        }).then(function() {
          stdout().should.equal('wuzzy');
          done();
        }).catch(function(err){
          (err === undefined).should.be.true;
          done(err);
        });
      });

      it('should execute a two-word-deep command', function(done) {
        exec('deep command arg', done, function(err) {
          stdout().should.equal('arg');
          done(err);
        });
      });

      it('should execute a three-word-deep command', function(done) {
        exec('very deep command arg', done, function(err) {
          stdout().should.equal('arg');
          done(err);
        });
      });

      it('should execute a long command with arguments', function(done) {
        exec('very complicated deep command abc123 -rad -sleep "well" -t -i "j" ', done, function(err) {
          stdout().should.equal('radtjabc123');
          done(err);
        });
      });

      it('should execute 50 async commands in sync', function(done) {
        this.timeout(4000);
        var dones = 0, result = '', should = '', total = 50;
        var handler = function() {
          dones++;
          if (dones == (total-1)) {
            result.should.equal(should);
            done();
          }
        }
        for (var i = 1; i < total; ++i) {
          should = should + i;
          vantage.exec('count ' + i).then(function(){
            result = result + stdout();
            handler();
          }).catch(function(err){
            done(err);
          })
        }
      });

    });

    describe('command validation', function() {

      it('should execute a command when not passed an optional variable', function(done) {
        exec('optional', done, function() {
          stdout().should.equal('');
          done();
        });
      });

      it('should understand --no-xxx options', function(done) {
        exec('i want --no-cheese', done, function() {
          stdout().should.equal('false');
          done();
        });
      });


      it('should show help when not passed a required variable', function(done) {
        exec('required', done, function() {
          (stdout().indexOf('Missing required argument') > -1).should.equal(true);
          done();
        });
      });

      it('should should execute a command when passed a required variable', function(done) {
        exec('required foobar', done, function() {
          stdout().should.equal('foobar');
          done();
        });
      });

      it('should show help when passed an invalid command', function(done) {
        exec('gooblediguck', done, function() {
          (stdout().indexOf('Invalid Command. Showing Help:') > -1).should.equal(true);
          done();
        });
      });

      it('should show subcommand help on invalid subcommand', function(done) {
        exec('very complicated', done, function() {
          stdout().should.containEql('very complicated deep *');
          done();
        });
      });

    });

    describe('navigation', function(){

      it('should error with 503 when connecting to an invalid server', function(done){
        vantage.exec('vantage 8088').then(function(data){
          (data || '').should.containEql('Error connecting');
          done();
        }).catch(function(err){ done(err); });
      });

      it('should hop from one server (8040) to another (8041)', function(done) {
        vantage.exec('vantage 8041').then(function(data){
          (data || '').should.not.containEql('Error connecting');
          done();
        }).catch(function(err){ done(err); });
      });

      it('should read the valid port from the new server (8041)', function(done){
        vantage.exec('port').then(function(data){
          (String(data) || '').should.equal('8041');
          done();
        }).catch(function(err){ done(err); });
      });

      it('should hop from second server (8041) to third server (8042)', function(done){
        vantage.exec('vantage 8042').then(function(data) {
          (data || '').should.not.containEql('Error connecting');
          done();
        }).catch(function(err){ done(err); });
      });

      it('should read the valid port from the third server (8042)', function(done){
        vantage.exec('port').then(function(data){
          (String(data) || '').should.equal('8042');
          done();
        }).catch(function(err){ done(err); });
      });

      it('should exit back to 8041', function(done){
        vantage.exec('exit').then(function(data){
          (data || '').should.containEql('Exited successfully');
          return vantage.exec('port');
        }).then(function(data){
          (String(data) || '').should.equal('8041');
          done();
        }).catch(function(err){ done(err); });
      });

      it('should exit back to 8040', function(done){
        vantage.exec('exit').then(function(data){
          (data || '').should.containEql('Exited successfully');
          return vantage.exec('port');
        }).then(function(data){
          (String(data) || '').should.equal('8040');
          done();
        }).catch(function(err){ done(err); });
      });

    });

    describe('mode', function() {

      it('should enter REPL mode', function(done){
        vantage.exec('repl').then(function(data) {
          (data || '').should.containEql("Entering REPL Mode");
          stdout().should.containEql("Entering REPL Mode");
          done();
        }).catch(function(err){ done(err); });
      });

      it('should execute arbitrary JS', function(done){
        vantage.exec('3*9').then(function(data) {
          (parseFloat(data) || '').should.equal(27);
          parseFloat(stdout()).should.equal(27);
          done();
        }).catch(function(err){ done(err); });
      });

      it('should exit REPL mode properly', function(done){
        vantage.exec('exit').then(function(data) {
          stdout();
          return vantage.exec('help');
        }).then(function() {
          stdout().should.containEql("vantage");
          done();
        }).catch(function(err){ done(err); });
      });

    });


  });

});

