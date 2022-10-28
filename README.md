# Spotify Song Credits

This application allows the recovery of track credits by scraping the Web App and organizes the data in a .json file.

Getting songwriter and producer credits through the Spotify API has been a long-requested feature, but unfortunately it is not yet possible to obtain this information from the official API, that's why I decided to develop this simple application.

## How to install the application
1. Clone the repository
2. Run `npm i` to install the dependencies
3. Run `mkdir data`

## How to use the application
1. Setup your Spotify Application and get the **Client ID** and **Client Secret**, you can find more informations there: <https://developer.spotify.com/documentation/general/guides/authorization/app-settings/>.
This is a necessary step because we need to access the official API to get all the links to scrape.

2. In the cloned repo folder, run `npm run config` and insert **Client ID** and **Client Secret**.

3. Now, run `npm run token` to get a token valid for 60 minutes (you can get another running again this command).

4. Finally, you can run `npm run scrape`, insert the artist **name** and **id** (the base-62 identifier that you can find at the end of the Spotify URL), and you will find the scraped information organized in a json file located in ./data.<br/>Each track has all the informations provided by the official API, plus the credits scraped by this application.<br/>During this process, you will be asked to set a **concurrency value**, which is an integer, and limits the number of parallel operations that the application performs.<br/>This value will heavily influence the performance, generally speaking i recommend to not set it above 8.








