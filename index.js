const TorrentSearchApi = require("torrent-search-api");
var torrentStream = require("torrent-stream");
const fs = require("fs");
const path = require("path");

TorrentSearchApi.enablePublicProviders();

const NOT_ALLOWED_FILE = ["bludv"];
const TEMP_PATH = path.join(__dirname, "tmp");
const BASE_DOWNLOAD_PATH = path.join(__dirname, "downloads");

if (!fs.existsSync(TEMP_PATH)) {
  fs.mkdirSync(TEMP_PATH);
}

if (!fs.existsSync(BASE_DOWNLOAD_PATH)) {
  fs.mkdirSync(BASE_DOWNLOAD_PATH);
}

const name = process.argv[2].split("-").join(" ");

const providers = TorrentSearchApi.getProviders();

console.log(
  `Search for "${name}" in providers: ${providers
    .map((p) => p.name)
    .join(", ")}`
);

console.log(
  `\nIf a long time passes without any feedback on the console, please cancel and try again.\n`
);

TorrentSearchApi.search(name, "Movies", 999999).then(async (torrents) => {
  let tryAgain = true;

  for (const torrent of torrents) {
    if (tryAgain) {
      const magnetUrl = await TorrentSearchApi.getMagnet(torrent);

      var engine = torrentStream(magnetUrl, {
        tmp: TEMP_PATH,
        path: TEMP_PATH,
      });

      engine.on("ready", function () {
        const file = engine.files.find(
          (file) =>
            file.name.endsWith(".mp4") &&
            !NOT_ALLOWED_FILE.some((w) => file.name.includes(w))
        );

        if (file) {
          var stream = file.createReadStream();
          tryAgain = false;
          console.log(">>>>>> Found Torrent!");
          Object.keys(torrent).forEach((key) => {
            console.log(`${key}: ${torrent[key]}`);
          });
          console.log(`Filename: ${file.name}`);
          var writeStream = fs.createWriteStream(
            path.join(BASE_DOWNLOAD_PATH, file.name)
          );
          stream.pipe(writeStream);
          let amountData = 0;
          stream.on("data", function (chunk) {
            const fileTotalSize = file.length;
            const percent = (amountData * 100) / fileTotalSize;
            console.log(`[${file.name}] %${percent} was downloaded`);
            amountData += chunk.length;
          });

          stream.on("end", function () {
            engine.files.forEach(function (f) {
              fs.unlinkSync(path.join(TEMP_PATH, f.path));
            });
            console.log(`[${file.name}] was downloaded successfully`);
          });
        } else {
          engine.destroy();
          console.log(
            `Skipping ${torrent.title} because it doesn't have a video file`
          );
        }
      });
    }
  }
});
