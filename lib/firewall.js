
/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , _ = require('lodash')
  , inSubnet = require('insubnet')
  ;

/**
 * Firewall prototype.
 */

var firewall = Firewall.prototype;

/**
 * Expose `Vantage`.
 */

module.exports = exports = Firewall;

/**
 * Initialize a new `Firewall` instance.
 *
 * @return {Firewall}
 * @api public 
 */

function Firewall() {
  this._rules = [];
  this._policy = 'ACCEPT';
  return this;
}

/**
 * Adds an accept rule.
 *
 * @param {String} address
 * @param {Integer} mask
 * @return {Firewall}
 * @api public 
 */

firewall.accept = function(address, mask) {
  return this._rule(address, mask, 'ACCEPT');
};

/**
 * Adds a reject rule.
 *
 * @param {String} address
 * @param {Integer} mask
 * @return {Firewall}
 * @api public 
 */

firewall.reject = function(address, mask) {
  return this._rule(address, mask, 'REJECT');
}

/**
 * Adds a rule.
 *
 * @param {String} address
 * @param {Integer} mask
 * @return {Firewall}
 * @api private 
 */

firewall._rule = function(address, mask, rule) {

  var parts = String(address).split('/');
  var subnet = mask || ((parts.length == 2) ? parts[1] : void 0);
  var ip = (parts.length == 2) ? parts[0] : address;

  subnet = (subnet === undefined) ? 32 : subnet;

  var valid = 
    (!this._isValidIp(ip)) ? 'Invalid IP Address passed: ' + ip : 
    (isNaN(subnet)) ? 'Invalid subnet mask passed: ' + subnet : 
    (subnet > 32) ? 'Subnet mask cannot be greater than 32: ' + subnet : 
    (subnet < 0) ? 'Subnet mask cannot be less than 0: ' + subnet : 
    true;

  if (valid !== true) {
    throw new Error(valid);
    return this;
  }

  this._rules.push({
    ip: ip,
    subnet: parseFloat(subnet),
    rule: rule,
  });

  return this;

}

/**
 * Getter for firewall._rules.
 *
 * @return {Array}
 * @api public
 */

firewall.rules = function() {
  return this._rules;
};

/**
 * Runs address against policy and 
 * rules, returns a bool determining
 * whether or not the IP is authorized.
 *
 * @param {String} ip
 * @return {Boolean}
 * @api public
 */

firewall.valid = function(ip) {

  var toIPv4 = function(addr) {
    var parts = String(addr).split(':');
    return parts[parts.length-1];
  }

  var addr = 
    (_.isString(ip)) ? ip :
    (_.isObject(ip) && ip.family === 'IPv6') ? toIPv4(ip.address) : 
    (_.isObject(ip)) ? ip.address : void 0;

  if (!this._isValidIp(addr)) {
    throw Error('Invalid IP Address passed to Firewall.prototype._process: ' + addr);
    return false;
  }

  var matches = [];
  for (var i = 0; i < this._rules.length; ++i) {
    var match = (inSubnet.Auto(addr, this._rules[i].ip, this._rules[i].subnet));
    if (match) {
      matches.push(this._rules[i]);
    }
  }

  if (matches.length == 0) {
    var valid = (this._policy == 'ACCEPT') ? true : false;
    return valid;
  }

  var pick = matches[0];
  var valid = (pick.rule == 'ACCEPT') ? true : false;
  return valid;
},

/**
 * Setter / Getter for the firewall's policy.
 *
 * @param {String} policy
 * @return {Firewall}
 * @api public
 */

firewall.policy = function(policy) {
  
  if (policy === undefined) { return this._policy }

  policy = String(policy).toUpperCase();
  policy = (policy == 'ALLOW') ? 'ACCEPT' : policy;
  policy = (policy == 'BLOCK') ? 'REJECT' : policy;
  policy = (policy == 'DENY') ? 'REJECT' : policy;
  
  if (['ACCEPT', 'REJECT'].indexOf(policy) == -1) {
    throw Error('Invalid firewall policy passed: ' + policy); 
    return this;
  }
  
  this._policy = policy;
  return this;
}

/**
 * Resets all firewall settings to default.
 *
 * @return {Firewall}
 * @api public
 */

firewall.reset = function() {
  this._rules = [];
  this._policy = 'ACCEPT';
  return this;
}

/**
 * Validates IP address.
 *
 * @param {String} ip
 * @return {Boolean}
 * @api private
 */

firewall._isValidIp = function(ip) {
  return ((/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)));
};

/**
 * Failover for forgetful bears.
 */

firewall.allow = Firewall.prototype.accept;
firewall.deny = Firewall.prototype.reject;
firewall.block = Firewall.prototype.reject;