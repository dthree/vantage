var assert = require("assert")
  , should = require('should')
  , Vantage = require('../')
  , util = require('./util/util')
  ;

var vantage = new Vantage();

var _stdout = '';

var onStdout = function(str) {
  _stdout += str;
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
        ports: [8040],
       }, function(err){
        (err === undefined).should.be.true;
        setTimeout(function(){
          done();
        }, 1500)
      });
    });

    after('cleanup', function(done) {
      util.kill('all', function(){
        console.log(stdout());
        done();
      });
    });

    it('should accept a vantage connection', function(done) {
      vantage
        .silent()
        .pipe(onStdout)
        .connect('127.0.0.1', '8040', {}).then(function(){
          stdout();
          done();
        }).catch(function(err){
          console.log('err!!' + err + '|' + (err === undefined));
          (err === undefined).should.be.true;
          done();
        });
    });

    var exec = function(cmd, done, cb) {
      vantage.exec(cmd).then(function(){
        cb();
      }).catch(function(err) {
        throw new Error(err);
        console.log('error now...'.red + err);
        (err === undefined).should.be.true;
        done();
      });
    }

    describe('command execution', function(){

      it('should execute a simple command', function(done) {
        exec('fuzzy', done, function() {
          stdout().should.equal('wuzzy');
          done();
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
          done();
        });
      });

      it('should execute a two-word-deep command', function(done) {
        exec('deep command arg', done, function() {
          stdout().should.equal('arg');
          done();
        });
      });

      it('should execute a three-word-deep command', function(done) {
        exec('very deep command arg', done, function() {
          stdout().should.equal('arg');
          done();
        });
      });

      it('should execute a long command with arguments', function(done) {
        exec('very complicated deep command abc123 -rad -sleep "well" -t -i "j" ', done, function() {
          stdout().should.equal('radtjabc123');
          done();
        });
      });

      it('should execute 50 async commands in sync', function(done) {

        this.timeout(8000);

        var dones = 0, result = '', should = '', total = 50;
        var handler = function() {
          dones++;
          if (dones == (total-1)) {
            //console.log('|' + should + '|');
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
            console.log('err...' + err);
            throw new Error(err);
            done();
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


    });



  });

});

