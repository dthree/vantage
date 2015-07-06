
/**
 * Module dependencies.
 */

var _ = require("lodash")
  , inquirer = require("inquirer")
  , EventEmitter = require("events").EventEmitter
  ;

var ui = {

  init: function() {

    var self = this;

    // Attached vantage instance. The UI can
    // only attach to one instance of Vantage
    // at a time, and directs all events to that
    // instance.
    this.parent = void 0;

    // Hook to reference active inquirer prompt.
    this._activePrompt;

    // Prompt Command History
    // Histctr moves based on number of times "up" (+= ctr)
    //  or "down" (-= ctr) was pressed in traversing 
    // command history.
    this._hist = [];
    this._histCtr = 0;

    // When in a "mode", we reset the 
    // history and store it in a cache until
    // exiting the "mode", at which point we 
    // resume the original history.
    this._histCache = [];
    this._histCtrCache = 0;

    // Fail-safe to ensure there is no double 
    // prompt in odd situations.
    this._midPrompt = false;

    // Handle for inquirer's prompt. 
    this.inquirer = inquirer;

    // Whether a prompt is currently in cancel mode.
    this._cancelled = false;

    // Modifying global? WTF?!? Yes. It is evil.
    // However node.js prompts are also quite
    // evil in a way. Nothing prevents dual prompts
    // between applications in the same terminal, 
    // and inquirer doesn't catch or deal with this, so
    // if you want to start two independent instances of 
    // vantage, you need to know that prompt listeners
    // have already been initiated, and that you can
    // only attach the tty to one vantage instance
    // at a time.
    // When you fire inqurier twice, you get a double-prompt,
    // where every keypress fires twice and it's just a
    // total mess. So forgive me.
    global.__vantage = global.__vantage || {}
    global.__vantage.prompt = global.__vantage.prompt || {
      exists: false
    }

    if (!global.__vantage.prompt.exists) {

      global.__vantage.prompt.exists;

      // Hook in to steal inquirer's keypress.
      inquirer.prompt.prompts.input.prototype.onKeypress = function(e) {
        self.emit('client_keypress', e);
        return self._keypressHandler(e, this);  
      };

      // Extend the render function to steal the active prompt object,
      // as inquirer doesn't expose it and we need it.
      (function(render){
        inquirer.prompt.prompts.input.prototype.render = function() {
          self._activePrompt = this;
          return render.call(this)
        }
      })(inquirer.prompt.prompts.input.prototype.render)

    }

  },

  prompt: function(options, cb) {
    var self = this;
    if (options.delimiter) {
      this.setDelimiter(options.delimiter);
    }
    self._midPrompt = true;
    inquirer.prompt(options, function(result) {
      self._midPrompt = false;
      cb(result);
    });
  },

  /**
   * Sets the temporarily delimiter based
   * on the delimiter provided by another
   * vantage server to this instance's client
   * upon the establishment of a session.
   *
   * @param {String} str
   * @api private
   */

  setDelimiter: function(str) {
    inquirer.prompt.prompts.password.prototype.prefix = function(){
      return str;
    }
    inquirer.prompt.prompts.input.prototype.prefix = function(){
      return str;
    }
    if (this._midPrompt) {
      this.refresh();
    }
  },

  /**
   * Event handler for keypresses - deals with command history
   * and tabbed auto-completion.                                   
   *
   * @param {Event} e
   * @param {Prompt} prompt
   * @api private
   */

  _keypressHandler: function(e, prompt) {
    this._activePrompt = prompt;
    var key = (e.key || {}).name;
    var value = (prompt) ? String(prompt.rl.line).trim() : void 0;
    this.emit("vantage_ui_keypress", { key: key, value: value });
  },

  /**
   * Helper for vantage._keypressHandler.
   *
   * @param {String} key
   * @param {String} value
   * @return {Function}
   * @api private
   */

  getKeypressResult: function(key, value) {
    var keyMatch = (["up", "down", "tab"].indexOf(key) > -1);
    if (keyMatch) {
      if (["up", "down"].indexOf(key) > -1) {
        return this.getHistory(key);
      } else if (key == "tab") {
        return str = this._getAutocomplete(value);
      }
    } else {
      this._histCtr = 0;
    }
  },

  refresh: function(options) {
    if (!this._activePrompt) { return }
    if (!this._midPrompt) { return false; }
    this._activePrompt.clean();
    this._midPrompt = false;
    this._cancelled = true;
    if (this._activePrompt.status != "answered") {
      this._activePrompt.status = "answered";
      this._activePrompt.done();
    }
    this._prompt({ sessionId: options.sessionId });
    return this;
  },

  pause: function() {
    if (!this._activePrompt) { return false; }
    if (!this._midPrompt) { return false; }
    var val = this._activePrompt.rl.line;
    this._activePrompt.clean().render();
    this._midPrompt = false;
    this._cancelled = true;
    this._activePrompt.status = "answered";
    this._activePrompt.done();
    return val;
  },

  resume: function(val) {
    val = val || "";
    if (!this._activePrompt) { return }
    if (this._midPrompt) { return }
    this._prompt();
    this._activePrompt.rl.line = val;
    this._activePrompt.rl.cursor = val.length;
    this._activePrompt.cacheCursorPos();
    this._activePrompt.clean().render().write( this._activePrompt.rl.line );
    this._activePrompt.restoreCursorPos();
    return this;
  },



  /**
   * Returns the appropriate command history
   * string based on an 'Up' or 'Down' arrow
   * key pressed by the user.
   *
   * @param {String} direction
   * @return {String} 
   * @api private
   */

  getHistory: function(direction) {
    if (direction == "up") {
      this._histCtr++;
      this._histCtr = (this._histCtr > this._hist.length) ? this._hist.length : this._histCtr;
    } else if (direction == "down") {
      this._histCtr--;
      this._histCtr = (this._histCtr < 1) ? 1 : this._histCtr;
    }
    return this._hist[this._hist.length-(this._histCtr)];
  },

  /**
   * Handles tab-completion. Takes a partial
   * string as "he" and fills it in to "help", etc.
   * Works the same as a linux terminal's auto-complete.
   *
   * @param {String} str
   * @return {String} 
   * @api private
   */

  _getAutocomplete: function(str) {
    var names = _.pluck(this.commands, "_name");
    var auto = this._autocomplete(str, names);
    return auto;
  },

  /**
   * Independent / stateless auto-complete function.
   * Parses an array of strings for the best match.
   *
   * @param {String} str
   * @param {Array} arr
   * @return {String} 
   * @api private
   */

  _autocomplete: function(str, arr) {
    arr.sort();
    var arrX = _.clone(arr);
    var strX = String(str);

    var go = function() {
      var matches = [];
      for (var i = 0; i < arrX.length; i++) {
        if (arrX[i].slice(0, strX.length).toLowerCase() == strX.toLowerCase()) {
          matches.push(arrX[i]);
        }
      }
      if (matches.length == 1) {
        return matches[0] + " ";
      } else if (matches.length == 0) {
        return void 0;
      } else {
        var furthest = strX;
        for (var i = strX.length; i < matches[0].length; ++i) {
          var curr = String(matches[0].slice(0, i)).toLowerCase();
          var same = 0;
          for (var j = 0; j < matches.length; ++j) {
            var sliced = String(matches[j].slice(0, curr.length)).toLowerCase();
            if (sliced == curr) {
              same++;
            }
          }
          if (same == matches.length) {
            furthest = curr;
            continue;
          } else {
            break;
          }
        }
        if (furthest != strX) {
          return furthest;
        } else {
          return void 0;
        }
      }
    }

    return go();
  },

  /**
   * Redraws the inquirer prompt with a new string.
   *
   * @param {Prompt} prompt
   * @param {String} str
   * @return {Vantage} 
   * @api private
   */

  _redraw: function(prompt, str) {
    prompt.rl.line = str;
    prompt.rl.cursor = str.length;
    prompt.cacheCursorPos();
    prompt.clean().render().write( prompt.rl.line );
    prompt.restoreCursorPos();
    return this;
  },

  attach: function(vantage) {
    this.parent = vantage;
    this.parent._prompt();
    //this.prompt();
  },

  detach: function(vantage) {

    if (vantage === this.parent) {
      this.parent = void 0;
    }

    // more to do.
  },

  history: function(str) {
    if (str) {
      this._hist.push(str);
    }
  },


}

_.assign(ui, EventEmitter.prototype);

/**
 * Expose `ui`.
 */

module.exports = exports = ui;

