'use strict';

module.exports = getArgv;

function getArgv(name) {
  var i;
  var data;
  for (i = 0; i < process.argv.length; i++) {
    if (process.argv[i].indexOf('--' + name) === 0) {
      data = process.argv[i].substr(2).split('=');
      return data[1] || true;
    }
  }
  throw Error('Missing required command line argument: --' + name);
}

getArgv.optional = function(name, defaultValue) {
  var i;
  var data;
  for (i = 0; i < process.argv.length; i++) {
    if (process.argv[i].indexOf('--' + name) === 0) {
      data = process.argv[i].substr(2).split('=');
      return data[1] || true;
    }
  }
  return defaultValue;
};