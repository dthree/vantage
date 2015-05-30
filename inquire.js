var inquirer = require('inquirer');


setInterval(function(){
	console.log('HI.... ' + Math.random()*10000);
}, 1000)

//var ui = new inquirer.ui.BottomBar();
//ui.updateBottomBar('hello: ');


inquirer.prompt({
	type: 'input',
	name: 'result',
	message: 'hello'
}, function(data){
	//console.log(data);
	fixStdoutFor(console);
})


function fixStdoutFor(cli) {
    var oldStdout = process.stdout;
    var newStdout = Object.create(oldStdout);
    newStdout.write = function() {
        cli.output.write('\x1b[2K\r');
        var result = oldStdout.write.apply(
            this,
            Array.prototype.slice.call(arguments)
        );
        cli._refreshLine();
        return result;
    }
    process.__defineGetter__('stdout', function() { return newStdout; });
}

