'use strict';

module.exports = function(url) {
  const match = /^(https?):\/\/([a-z0-9-\.]+)(?::(\d+))?\/?([\s\S]+?)\/?$/.exec(url);
  if (!match) return null;
  return {
    fullRoute: '/' + match[4],
    host: match[2],
    port: parseInt(match[3]) || 80,
    protocol: match[1].toLowerCase(),
    query: buildQueryObject(match[4].split('?')[1]),
    route: '/' + match[4].split('?')[0]
  }
};

function buildQueryObject(str) {
  const result = {};
  if (str) {
    str.split('&').forEach(function(pair) {
      const ar = pair.split('=');
      result[ar[0]] = ar[1];
    });
  }
  return result;
}