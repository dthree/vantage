var intercept = require("intercept-stdout"),
    captured_text = "";
 
var unhook = intercept(function(txt) {
    captured_text += txt;
    return txt = '';
});
 
console.log("This text is being captured");
 
// Let's stop capturing stdout. 
unhook();
 
console.log("This text is not being captured");
console.log("But I captured: " + captured_text);