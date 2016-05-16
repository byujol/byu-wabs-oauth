'use strict';
const phantom       = require('phantom');
const Promise       = require('bluebird');

module.exports = Promise.coroutine(function *() {
  const loads = [];
  const instance = yield phantom.create(['--ignore-ssl-errors=yes', '--web-security=no']);
  const page = yield instance.createPage();
  const queue = [];

  page.exit = function () {
    page.close();
    instance.exit();
  };

  page.getData = Promise.coroutine(function *() {
    const result = {};
    const cookies = yield page.property('cookies');
    result.content = yield page.property('content');
    result.title = yield page.property('title');
    result.url = yield page.property('url');

    const cookiesMap = {};
    cookies.forEach(cookie => cookiesMap[cookie.name] = cookie);
    result.cookies = cookiesMap;

    return Promise.resolve(result);
  });

  page.onLoad = function() {
    const deferred = {};
    deferred.promise = new Promise(function(resolve, reject) {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    if (loads.length === 0) {
      queue.push(deferred);
    } else {
      deferred.resolve(loads.shift());
    }
    return deferred.promise;
  };

  page.on('onLoadFinished', false, Promise.coroutine(function *() {
    yield awaitReadyState(page);
    const result = yield page.getData();
    if (queue.length > 0) {
      queue.shift().resolve(result);
    } else {
      loads.push(result);
    }
  }));

  return Promise.resolve(page);

});

function awaitReadyState(page) {
  return new Promise(function(resolve, reject) {
    function checkReadyState() {
      setTimeout(function () {
        page.evaluate(
          function () {
            return document.readyState;
          })
          .then(function(readyState) {
            if ("complete" === readyState) return resolve();
            checkReadyState();
          });
      }, 100);
    }

    checkReadyState();
  });
}