'use strict';
const http        = require('http');
const Promise     = require('bluebird');

module.exports = function(port, handler) {
  return new Promise(function(resolve, reject) {
    const callbacks = [];

    const server = http.createServer((req, res) => {
      handler(req, res);
      server.close();
    });

    server.listen(port, function(err) {
      if (err) return reject(err);
      resolve(server);
    });
  });
};