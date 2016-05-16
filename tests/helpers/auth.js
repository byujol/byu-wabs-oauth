'use strict';
const analyzeUrl      = require('./analyze-url');
const phantomPage     = require('./phantom-page');
const Promise         = require('bluebird');
const Serve           = require('./serve');

exports.checkCasNetIdPassword = Promise.coroutine(function *(netId, password) {
  const page = yield phantomPage();

  page.open('https://cas.byu.edu/cas/login');
  yield page.onLoad();

  // fill out the login form and submit
  page.evaluate(function (netId, password) {
    document.querySelector('#netid').value = netId;
    document.querySelector('#password').value = password;
    document.querySelector('form').submit();
  }, netId, password);
  yield page.onLoad();

  const isDuoPage = yield page.switchToFrame('duo_iframe');
  if (isDuoPage) {
    throw Error('Dual authentication is not currently supported.');
    /*const found = yield page.evaluate(function() {
      const buttons = document.querySelectorAll('button');
      var i;
      for (i = 0; i < buttons.length; i++) {
        if (/send me a push/i.test(buttons[i].innerHTML)) {
          const rect = buttons[i].getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          const ev = document.createEvent("MouseEvent");
          ev.init('click', true, true, window, null, 0, 0, 0, 0, false, false, false, false, 0, null);
          buttons[i].dispatchEvent(ev);
          return true;
        }
      }
      return false;
    });
    console.log('Found: ' + found);
    yield page.onLoad();*/
  }

  // get logged in data
  const data = yield page.getData();
  const valid = data.cookies.hasOwnProperty('CASTGC');
  
  page.exit();
  
  return Promise.resolve(valid);
});

exports.getOauthCode = Promise.coroutine(function *(url, netId, password, port, approve) {
  const page = yield phantomPage();
  var data;
  if (arguments.length < 5) approve = true;
  
  // start the server that will listen for the oauth code
  yield Serve(port, (req, res) => res.end());

  page.open(url);
  yield page.onLoad(); // WS02 redirect page
  yield page.onLoad(); // cas login page

  // fill out the login form and submit
  page.evaluate(function (netId, password) {
    document.querySelector('#netid').value = netId;
    document.querySelector('#password').value = password;
    document.querySelector('form').submit();
  }, netId, password);
  yield page.onLoad(); // authentication completed

  // approve oauth request
  yield page.onLoad(); // WS02 auth page
  page.evaluate(function(value) {
    document.getElementById('consent').value = value;
    document.getElementById("profile").submit();
  }, approve ? 'approve' : 'deny');
  
  // read the code from the URL
  data = yield page.onLoad();
  const oauthCode = analyzeUrl(data.url).query.code;
  
  // shut down the browser
  page.exit();

  return Promise.resolve(oauthCode);
});