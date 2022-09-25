const prompt = require('prompt-sync')({sigint: true});
const fs = require('fs');


const CLIENT_ID = prompt('Insert client id: ');
const CLIENT_SECRET = prompt('Insert client secret: ');

fs.writeFileSync(`./config.json`, JSON.stringify({
    CLIENT_ID: CLIENT_ID,
    CLIENT_SECRET: CLIENT_SECRET
}), "utf-8");

console.log('Success')