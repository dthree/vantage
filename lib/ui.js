
/**
 * Module dependencies.
 */

var _ = require("lodash")
  , inquirer = require("inquirer")
  , EventEmitter = require("events").EventEmitter
  , VantageUtil = require("./util")
  , chalk = require("chalk")
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

    // Fail-safe to ensure there is no double
    // prompt in odd situations.
    this._midPrompt = false;

    // Handle for inquirer's prompt.
    this.inquirer = inquirer;

    // Whether a prompt is currently in cancel mode.
    this._cancelled = false;

    // Middleware for piping stdout through.
    this._pipeFn = void 0;

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
  },

  prompt: function(options, cb) {
    var self = this;
    options = options ||{}
    if (!this.parent) { return }
    if (options.delimiter) {
      this.setDelimiter(options.delimiter);
    }
    if (options.message) {
      this.setDelimiter(options.message);
    }
    if (self._midPrompt) {
      console.log("Prompt called when mid prompt...")
      throw new Error("UI Prompt called when already mid prompt.");
      return;
    }
    self._midPrompt = true;
    try {
      inquirer.prompt(options, function(result) {
        self._midPrompt = false;
        cb(result);
      });
    } catch(e) {
      console.log("Vantage Prompt error:", e);
    }
  },

  midPrompt: function() {
    return (
      (this._midPrompt && this.parent) ? true : false
    );
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
    if (!this.parent) { return }
    str = String(str).trim() + " ";
    inquirer.prompt.prompts.password.prototype.prefix = function(){
      return str;
    }
    inquirer.prompt.prompts.input.prototype.prefix = function(){
      return str;
    }
    if (this._midPrompt) {
      //this.refresh();
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
    if (!this.parent) { return }
    this._activePrompt = prompt;
    var key = (e.key || {}).name;
    var value = (prompt) ? String(prompt.rl.line).trim() : void 0;
    this.emit("vantage_ui_keypress", { key: key, value: value });
  },

  refresh: function(options) {
    if (!this.parent) { return }
    if (!this._activePrompt) { return }
    if (!this._midPrompt) { return false; }
    this._activePrompt.clean();
    this._midPrompt = false;
    this._cancelled = true;
    if (this._activePrompt.status != "answered") { // huh?
      this._activePrompt.status = "answered";
      this._activePrompt.done();
    }
    this._cancelled = false;
    this.parent._prompt();
    return this;
  },

  pause: function() {
    if (!this.parent) { return }
    if (!this._activePrompt) { return false; }
    if (!this._midPrompt) { return false; }
    var val = this._activePrompt.rl.line;
    this._midPrompt = false;
    this._cancelled = true;
    this._activePrompt.clean();
    this._activePrompt.status = "answered";
    this._activePrompt.done();
    return val;
  },

  resume: function(val) {
    if (!this.parent) { return }
    val = val || "";
    if (!this._activePrompt) { return; }
    if (this._midPrompt) { return; }
    this.parent._prompt();
    this._activePrompt.rl.line = val;
    this._activePrompt.rl.cursor = val.length;
    this._activePrompt.cacheCursorPos();
    this._activePrompt.clean().render().write( this._activePrompt.rl.line );
    this._activePrompt.restoreCursorPos();
    return this;
  },

  /**
   * Redraws the inquirer prompt with a new string.
   *
   * @param {Prompt} prompt
   * @param {String} str
   * @return {Vantage}
   * @api private
   */

  redraw: function(str) {
    if (!this.parent) { return }
    this._activePrompt.rl.line = str;
    this._activePrompt.rl.cursor = str.length;
    this._activePrompt.cacheCursorPos();
    this._activePrompt.clean().render().write( this._activePrompt.rl.line );
    this._activePrompt.restoreCursorPos();
    return this;
  },

  attach: function(vantage) {
    this.parent = vantage;
    //this.parent.on("")
    this.refresh();
    this.parent._prompt();
    //this.prompt();
  },

  log: function() {

    var args = VantageUtil.fixArgsForApply(arguments);

    args = (_.isFunction(this._pipeFn))
      ? this._pipeFn.call(this, args)
      : args;

    if (args === "") {
      return;
    }

    args = VantageUtil.fixArgsForApply(args);

    if (this.midPrompt()) {
      var data = this.pause();
      console.log.apply(console.log, args);
      if (typeof data !== "undefined" && data !== false) {
        this.resume(data);
      } else {
        console.log("Log got back 'false' as data. This shouldn't happen.", data);
      }
    } else {
      console.log.apply(console.log, args);
    }

    return this;
  },

  detach: function(vantage) {

    if (vantage === this.parent) {
      this.parent = void 0;
    }

    // more to do.
  },


}

_.assign(ui, EventEmitter.prototype);

/**
 * Expose `ui`.
 */


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
global.__vantage.ui = global.__vantage.ui || {
  exists: false,
  exports: void 0
}

if (!global.__vantage.ui.exists) {
  global.__vantage.ui.exists = true;
  global.__vantage.ui.exports = ui;
  module.exports = exports = ui;
  ui.init();
} else {
  module.exports = global.__vantage.ui.exports;
}


