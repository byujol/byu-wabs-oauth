"use strict"
const AWS           = require('aws-sdk')
const Oauth         = require('../index')
const expect        = require('chai').expect
const http          = require('http');
const puppeteer     = require('puppeteer')

process.on('unhandledRejection', err => {
  console.error(err.stack)
})

describe('byu-wabs-oauth', function() {
  const config = {}
  let oauth

  // get WSO2 credentials from AWS parameter store
  before(done => {
    console.log('Acquiring test credentials. Please wait...')

    const ssm = new AWS.SSM({ region: 'us-west-2' })
    const params = {
      Name: 'wabs-oauth-test.dev.config',
      WithDecryption: true
    }
    ssm.getParameter(params, function(err, param) {
      if (err) {
        console.error('AWS Error: ' + err.message)
        console.log('Make sure that you have awslogin (https://github.com/byu-oit/awslogin) ' +
          'installed, run the command "awslogin" in your terminal, and select the "dev-oit-byu" ' +
          'account.')
        process.exit(1)
      }

      try {
        Object.assign(config, JSON.parse(param.Parameter.Value))
        console.log('Test credentials acquired successfully')
      } catch (err) {
        console.error('Parameter parsing error: ' + err.message)
        process.exit(1)
      }

      oauth = Oauth(config.consumerKey, config.consumerSecret)
      done()
    })
  })

  after(() => {
    setTimeout(() => {
      process.exit(0)
    }, 500)
  })

  describe('authorizedRequest', () => {

    it('will add bearer token to request', async () => {
      const token = await oauth.getClientGrantToken()
      const res = await oauth.authorizedRequest({
        url: 'https://api.byu.edu:443/openid-userinfo/v1/userinfo?schema=openid',
        token
      })
      expect(res.statusCode).to.equal(200)
    })

    it('will automatically retry if a bad token is present', async () => {
      const token = await oauth.getClientGrantToken()
      token.accessToken = token.accessToken.substr(1) + token.accessToken[0]
      const res = await oauth.authorizedRequest({
        url: 'https://api.byu.edu:443/openid-userinfo/v1/userinfo?schema=openid',
        token
      })
      expect(res.statusCode).to.equal(200)
    })

  })

  describe('createToken', () => {

    it('can create token', async () => {
      const token = await oauth.getClientGrantToken()
      const token2 = await oauth.createToken(token.expiresAt, token.accessToken, token.refreshToken)
      expect(token2.revoke).to.be.a('function')
    })

    it('can revoke the token', async () => {
      const token = await oauth.getClientGrantToken()
      const token2 = await oauth.createToken(token.expiresAt, token.accessToken, token.refreshToken)
      await token2.revoke()
      expect(token2.accessToken).to.equal(undefined)
    })

  })

  describe('getClientGrantToken', () => {

    it('can get token', async () => {
      const token = await oauth.getClientGrantToken()
      expect(token.accessToken).to.be.a('string')
    })

    it('can revoke token', async () => {
      const token = await oauth.getClientGrantToken()
      await token.revoke()
      expect(token.accessToken).to.equal(undefined)
    })

    it('can refresh token', async () => {
      const token = await oauth.getClientGrantToken()
      await token.refresh()
      expect(token.accessToken).to.be.a('string')
    })

  })

  describe('getCodeGrantToken', () => {
    let token

    before(async () => {
      const redirectUrl = 'http://localhost:7880/'
      const url = await oauth.getAuthorizationUrl(redirectUrl)

      // start a server that will listen for the OAuth code grant redirect
      const server = http.createServer((req, res) => {
        const match = /^\/\?code=(.+)$/.exec(req.url)
        if (match) {
          const [, code ] = match
          res.statusCode = 200
          oauth.getCodeGrantToken(code, 'http://localhost:7880/')
            .then(t => {
              token = t
              res.end()
            })
            .catch(err => {
              res.statusCode = 500
              res.write(err.stack)
              res.end()
            })
        } else {
          res.statusCode = 400
          res.end()
        }
      });
      const listener = server.listen(7880)

      // start the browser and log in
      const browser = await puppeteer.launch({ headless: true })
      const page = await browser.newPage()
      await page.goto(url)  // go to API manager which will redirect to CAS
      await page.waitForNavigation(); // wait for CAS page load
      await page.type('#netid', config.netId)
      await page.type('#password', config.password)
      await page.click('input.submit[type="submit"]') // navigates back to API manager
      await page.waitForNavigation(); // wait for redirect back to localhost

      // shut down the server and close the browser
      listener.close()
      await browser.close()
    })

    it('can get token', () => {
      expect(token.accessToken).to.be.a('string')
    })

    it('has correct identity', () => {
      expect(token.resourceOwner.sortName).to.equal('Ithica, Oauth')
    })

    it('can refresh token', async () => {
      const token = await oauth.getClientGrantToken()
      await token.refresh()
      expect(token.accessToken).to.be.a('string')
    })

    it('can revoke token', async () => {
      const token = await oauth.getClientGrantToken()
      await token.revoke()
      expect(token.accessToken).to.equal(undefined)
    })

  })

})