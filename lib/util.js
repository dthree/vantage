
/**
 * Module dependencies.
 */

var util = {

  /**
   * Parses command arguments from multiple
   * sources.
   *
   * @param {String} value
   * @param {String} env
   * @param {String} file
   * @return {Array} 
   * @api private
   */

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

  /**
   * Makes an argument name pretty for help.
   *
   * @param {String} arg
   * @return {String}
   * @api private
   */

  humanReadableArgName: function(arg) {
    var nameOutput = arg.name + (arg.variadic === true ? '...' : '');
    return arg.required
      ? '<' + nameOutput + '>'
      : '[' + nameOutput + ']'
  },

  /**
   * Pads a value with with space or
   * a specified delimiter to match a
   * given width.
   *
   * @param {String} str
   * @param {Integer} width
   * @param {String} delimiter
   * @return {String}
   * @api private
   */

  pad: function(str, width, delimiter) {
    width = Math.floor(width)
    delimiter = delimiter || ' ';
    var len = Math.max(0, width - str.length);
    return str + Array(len + 1).join(delimiter);
  },

}

/**
 * Expose `util`.
 */

module.exports = exports = util;


