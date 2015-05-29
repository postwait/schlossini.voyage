require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/lib/errors":[function(require,module,exports){
(function (global){
'use strict';

var t = function(scope, msg) {
  if(msg === undefined) {
    msg = scope;
    scope = global;
  }
  if(msg == null) return null;

  if(scope === 'confirm') {
    if(/unique constraint.*email/.test(msg)) {
      return "We won't send more than one email every two hours.";
    }
    else if(/bad/.test(msg)) {
      return "Your confirmation code doesn't appear to be valid.";
    }
  }

  if(/unique constraint.*email/.test(msg)) {
    return "Looks like that email address is traveling with us already."
  }
  return "Something sure went wrong... We're as puzzled as you are."
}

module.exports = {
  translate: t
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[]);
