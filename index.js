const config = require("./config.json");
const Promise = require("bluebird");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const util = require("util");
const fs = require("fs");
const prompt = require("prompt-sync")({ sigint: true });

//token;
const token = config.TOKEN;
if (token === undefined) {
  console.log('Missing token, run "npm run token" first');
}

//imposta gli headers necessari per effettuare la richiesta GET all'API;
const settings = {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
};

//contiene le tracce recuperate dalla funzione getTracks;
const foundTracks = [];

//contiene le tracce per la quale non è stato possibile scrapare i dati relativi ai riconoscimenti;
const missingTracks = [];

//contatore necessario per impostare il parametro offset nell'API e gestire la paginazione dei risultati;
let counter = 0;

//restituisce un array contenente tutte le sue tracce in piattaforma;
const getTracks = async (artist, id) => {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${artist}&type=track&limit=50&offset=${counter}`,
      settings
    );
    const data = await res.json();

    //contiene tutte le tracce data la parola chiave specificata col parametro 'artist';
    const tracks = data.tracks.items.filter((item) =>
      item.artists.some((element) => element.uri === `spotify:artist:${id}`)
    );

    //verifica che le tracce appartengano ad un artista preciso, confrontando l'id e la posizione nell'array 'artists';
    const filteredTracks = tracks.filter(
      (item) =>
        item.artists.indexOf(
          item.artists.find((element) => element.uri === `spotify:artist:${id}`)
        ) === 0
    );

    //popola l'array foundTracks con gli elementi filtrati;
    filteredTracks.forEach((item) => foundTracks.push(item));

    //incrementa il valore di counter, così da poter ottenere i 50 risultati (massimo consentito per request) successivi nella prossima iterazione;
    counter = counter + 50;

    //eovca la funzione sino al raggiungimento dei 1000 risultati (offset=999), massimo consentito;
    if (counter === 1000) {
      counter = 999;
    } else if (counter > 999) {
      return;
    } else {
      await getTracks(artist, id);
    }
  } catch (e) {
    console.log("Invalid or expired token");
  }
};

//accetta come parametri il nome dell'artista e l'id corrispondente ed esegue lo scraping sulla web app di spotify -->
//--> recuperando le informazioni che l'api non fornisce, relative agli scrittori e ai produttori di una traccia;
const getCredits = async (
  artist,
  id,
  initialLoadingValue = 0,
  concurrency_number
) => {
  //contiene i riconoscimenti di ogni traccia contenuta dell'array foundTracks;
  const credits = [];

  //recupera tutte le tracce dato un artista;
  await getTracks(artist, id);
  console.log("Tracks found:", foundTracks.length);

  //rimuove nella lista delle tracce tutti i duplicati;
  const titles = foundTracks.map((item) => item.name);
  const removeDuplicateTracks = foundTracks.filter(
    (item, index) => titles.indexOf(item.name) === index
  );
  console.log("Without duplicates", removeDuplicateTracks.length);

  //avvia l'istanza headless di Chromium;
  const browser = await puppeteer.launch({ headless: true });

  //esegue lo scraping e recupera le informazioni mancanti di una traccia;
  const getTrackCredits = async (track, trackList) => {
    const page = await browser.newPage();
    try {
      //nell'oggetto track fornitoci dall'API di Spotify -->
      // --> troviamo un link che reindirizza alla pagina dedicata alla singola traccia;
      await page.goto(track.external_urls.spotify, {
        waitUntil: "networkidle2",
      });
      await page.setViewport({ width: 800, height: 600 });

      //verifica che sia apparso o meno il pop-up dei cookie;
      if (await page.$("#onetrust-accept-btn-handler")) {
        await page.click("#onetrust-accept-btn-handler");
        await page.waitForSelector("#onetrust-banner-sdk > div", {
          hidden: true,
        });
      }

      //raggiunge la sezione 'Riconoscimenti' del sito;
      await page.waitForSelector(
        "#main > div > div.Root__top-container > div.Root__main-view > div.main-view-container > div.os-host.os-host-foreign.os-theme-spotify.os-host-resize-disabled.os-host-scrollbar-horizontal-hidden.main-view-container__scroll-node.os-host-transition.os-host-overflow.os-host-overflow-y > div.os-padding > div > div > div.main-view-container__scroll-node-child > main > section > div.contentSpacing.NXiYChVp4Oydfxd7rT5r.RMDSGDMFrx8eXHpFphqG > div.RP2rRchy4i8TIp1CTmb7 > span > h1"
      );
      await page.click(
        "#main > div > div.Root__top-container > div.Root__main-view > div.main-view-container > div.os-host.os-host-foreign.os-theme-spotify.os-host-resize-disabled.os-host-scrollbar-horizontal-hidden.main-view-container__scroll-node.os-host-transition.os-host-overflow.os-host-overflow-y > div.os-padding > div > div > div.main-view-container__scroll-node-child > main > section > div.contentSpacing.NXiYChVp4Oydfxd7rT5r.RMDSGDMFrx8eXHpFphqG > div.RP2rRchy4i8TIp1CTmb7 > span > h1",
        { button: "right" }
      );
      await page.waitForSelector(
        "#context-menu > ul > li:nth-child(2) > button"
      );
      await page.click("#context-menu > ul > li:nth-child(2) > button", {
        button: "left",
      });
      await page.waitForSelector(
        "body > div:nth-child(33) > div > div > div > div.Nw1INlIyra3LT1JjvoqH > div > div:nth-child(3)"
      );

      //preleva i dati relativi agli scrittori e ai produttori;
      const wrote_by = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            "body > div:nth-child(33) > div > div > div > div.Nw1INlIyra3LT1JjvoqH > div > div:nth-child(3) > span"
          ),
          (e) => e.textContent
        )
      );
      const produced_by = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            "body > div:nth-child(33) > div > div > div > div.Nw1INlIyra3LT1JjvoqH > div > div:nth-child(4) > span"
          ),
          (e) => e.textContent
        )
      );

      //crea un oggetto con le informazioni recuperate, unite a quelle già fornite dall'API;
      const creditsObj = {
        ...track,
        wrote_by: wrote_by,
        produced_by: produced_by,
      };

      //inserisce l'oggetto nell'array credits;
      credits.push(creditsObj);
    } catch (e) {
      console.log(
        "An error has occurred at track number",
        trackList.indexOf(track),
        track.external_urls.spotify
      );
      //nel caso in cui ci fossero problemi nello scraping dei dati relativi ad una traccia, inserisce quest'ultima -->
      // --> in un array apposito;
      missingTracks.push(track);
    } finally {
      await page.close();

      //aggiorna lo stato d'avanzamento
      initialLoadingValue += 100 / trackList.length;
      console.log(`Progress: ${Math.round(initialLoadingValue * 100) / 100}%`);
    }
  };

  //esegue la funzione getTrackCredits su ogni traccia, ovvero ogni elemento dell'array removeDuplicateTracks;
  await Promise.map(
    removeDuplicateTracks,
    (track) => getTrackCredits(track, removeDuplicateTracks),
    { concurrency: concurrency_number }
  );
  console.log("There was", missingTracks.length, "missing tracks");

  //verifica che lo scraping sia andato a buon fine per ogni traccia, -->
  //--> in caso contrario prova ad eseguirlo nuovamente solo sulle tracce inserite nell'array missingTracks;
  if (missingTracks.length > 0) {
    initialLoadingValue = 0;
    const previousCreditsLength = credits.length;
    console.log("Tryng to get missing tracks...");
    await Promise.map(
      missingTracks,
      (track) => getTrackCredits(track, missingTracks),
      { concurrency: 8 }
    );
    console.log(`Got ${credits.length - previousCreditsLength} new tracks`);
  }

  //genera un file contente tutte le informazioni;
  const day = new Date();
  const date = day.toISOString().substring(0, 10);
  fs.writeFileSync(
    `./data/${artist}_${date}.json`,
    JSON.stringify(credits, null, 1),
    "utf-8"
  );

  console.log("Found infos about", credits.length, "tracks");
  console.log(`Completed, check directory: ./data/${artist}_${date}.json`);
  browser.close();
};

const main = () => {
  const artist = prompt("Insert artist name: ").split(" ").join("%20");
  const id = prompt("Insert artist id: ");
  const number = Number(prompt("Insert concurrency value: "));
  getCredits(artist, id, 0, number);
};

main();
