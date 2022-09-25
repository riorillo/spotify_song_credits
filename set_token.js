const config = require('./config.json');
const CLIENT_ID = config.CLIENT_ID;
const CLIENT_SECRET = config.CLIENT_SECRET;
const request = require('request');
const util = require("util");
const fs = require('fs');



const authOptions = {url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
    },
    form: {
      grant_type: 'client_credentials'
    },
    json: true
  };
  
  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      const TOKEN = body.access_token;
      const object = {
        TOKEN: TOKEN,
        CLIENT_ID: CLIENT_ID,
        CLIENT_SECRET: CLIENT_SECRET
      }
      console.log('Success')
      fs.writeFileSync(`./config.json`, JSON.stringify(object), "utf-8");
    };
  });

  