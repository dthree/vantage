var assert = require("assert")
  , should = require('should')
  , Vantage = require('../')
  , util = require('./util/util')
  ;

var vantage = new Vantage();

var stdout = '';
var onStdout = function(str) {
  stdout += str;
}

describe('vantage integration', function() {


  describe('vantage server', function() {

    before('should start on three ports', function(done){
      this.timeout(8000);
      util.startInstances({
        ports: [8040],
       }, function(err){
        should.not.exist(err);
        setTimeout(function(){
          done();
        }, 1000)
      });
    });

    after('cleanup', function(done) {
      console.log('\n\n------------------------------------------------');
      console.log(stdout);
      done();
    });

    it('should accept a vantage connection', function(done) {
      vantage
        .silent()
        .pipe(onStdout)
        .connect('127.0.0.1', '8040', {}).then(function(){
          stdout = '';
          done();
        }).catch(function(err){
          should.not.exist(err);
        });
    });

    it('should execute a simple command', function(done) {
      vantage
        .exec('fuzzy').then(function(){
          stdout.should.equal('wuzzy'); stdout = '';
          done();
        }).catch(function(err){
          should.not.exist(err);
          done();
        });
    });

    it('should chain two async commands', function(done) {
      this.timeout(4000);

      vantage
        .exec('foo').then(function() {
          stdout.should.equal('bar'); stdout = '';
          return vantage.exec('fuzzy');
        }).then(function() {
          stdout.should.equal('wuzzy'); stdout = '';
          done();
        }).catch(function(err){
          should.not.exist(err);
          done();
        });
    });



  });

});

