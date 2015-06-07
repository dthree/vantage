
var util = {

  parseArgs: function(value, env, file) {
    var reg = /[^\s'"]+|['"]([^'"]*)['"]/gi, str = value, arr = [], match;
    if (env) { arr.push(env); }
    if (file) { arr.push(file); }
    do {
      match = reg.exec(str);
      if (match !== null) {
        arr.push(match[1] ? match[1] : match[0]);
      }
    } while (match !== null);
    return arr;
  },

  humanReadableArgName: function(arg) {
    var nameOutput = arg.name + (arg.variadic === true ? '...' : '');

    return arg.required
      ? '<' + nameOutput + '>'
      : '[' + nameOutput + ']'
  },

  pad: function(str, width, delimiter) {
    delimiter = delimiter || ' ';
    var len = Math.max(0, width - str.length);
    return str + Array(len + 1).join(' ');
  },


}

module.exports = exports = util;


