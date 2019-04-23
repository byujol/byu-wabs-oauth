'use strict'
process.env.DEBUG = 'wabs*'
const AWS = require('aws-sdk')
const Oauth = require('../index')
const expect = require('chai').expect
const http = require('http')
const puppeteer = require('puppeteer')

/* global describe before beforeEach after it */

process.on('unhandledRejection', err => {
  console.error(err.stack)
})

describe('byu-wabs-oauth', function () {
  const config = {}
  let oauth

  // get WSO2 credentials from AWS parameter store
  before(function (done) {
    this.timeout(5000)
    console.log('Acquiring test credentials. Please wait...')

    const ssm = new AWS.SSM({ region: 'us-west-2' })
    const params = {
      Name: 'wabs-oauth-test.dev.config',
      WithDecryption: true
    }
    ssm.getParameter(params, async function (err, param) {
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

      oauth = await Oauth(config.consumerKey, config.consumerSecret)
      done()
    })
  })

  after(() => {
    setTimeout(() => {
      process.exit(0)
    }, 500)
  })

  describe('getClientGrantToken', () => {
    it('can get token', async () => {
      const token = await oauth.getClientGrantToken()
      expect(token.accessToken).to.be.a('string')
    })
  })

  describe('getCodeGrantToken', () => {
    const redirectUrl = 'http://localhost:7880/'
    let listener
    let token

    before(function (done) {
      this.timeout(5000)
      // start a server that will listen for the OAuth code grant redirect
      const server = http.createServer((req, res) => {
        const match = /^\/\?code=(.+)$/.exec(req.url)
        if (match) {
          const [ , code ] = match
          res.statusCode = 200
          oauth.getAuthCodeGrantToken(code, redirectUrl)
            .then(t => {
              token = t
              res.end()
            })
            .catch(err => {
              console.error(err.stack)
              res.statusCode = 500
              res.write(err.stack)
              res.end()
            })
        } else {
          res.statusCode = 400
          res.end()
        }
      })

      listener = server.listen(7880, done)
    })

    // start the browser and log in
    beforeEach(async function () {
      token = null

      this.timeout(5000)
      const url = await oauth.getAuthorizationUrl(redirectUrl)

      const browser = await puppeteer.launch({ headless: true })
      const page = await browser.newPage()
      await page.goto(url) // go to API manager which will redirect to CAS
      await page.waitForSelector('#netid') // wait for CAS page load
      await page.type('#netid', config.netId)
      await page.type('#password', config.password)
      await page.click('input.submit[type="submit"]') // navigates back to API manager
      await page.waitForNavigation() // wait for redirect back to localhost

      await new Promise(resolve => {
        const intervalId = setInterval(() => {
          if (token !== null) {
            clearInterval(intervalId)
            resolve()
          }
        })
      })

      // close the browser
      await browser.close()
    })

    after(() => {
      // shut down the server
      listener.close()
    })

    it('can get token', () => {
      expect(token.accessToken).to.be.a('string')
    })

    it('has correct identity', () => {
      expect(token.resourceOwner.sortName).to.equal('Ithica, Oauth')
    })

    it('can refresh token', async () => {
      const before = { accessToken: token.accessToken, refreshToken: token.refreshToken }
      token = await oauth.refreshToken(token.refreshToken)
      const after = { accessToken: token.accessToken, refreshToken: token.refreshToken }
      expect(token.accessToken).to.be.a('string')
      expect(after.accessToken).not.to.equal(before.accessToken)
      expect(after.refreshToken).not.to.equal(before.refreshToken)
    })

    it('can revoke token', async () => {
      await oauth.revokeToken(token.accessToken, token.refreshToken)
    })
  })
})
