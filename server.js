const axios = require("axios");
const sendEmail = require("./util/mail");
const express = require("express");
let upload = require("./upload.js");
let app = express();
let fs = require("fs");
let csvWriter = require("csv-write-stream");
let cron = require("node-cron");
const handlebars = require("express-handlebars");
let saveDirectory = "data"; // ex : 'data' or '/tmp'

// pm2 오픈 시 초기 생성
let output_path_second =
  saveDirectory + "/second " + new Date().toDateString() + ".csv";

let serverTimeInterval;

axios.get("https://api.binance.com/api/v3/time").then(({ data }) => {
  serverTimeInterval = Date.now() - data.serverTime;
  console.log("server time set to " + serverTimeInterval);
});

try {
  // FIX THIS - second
  if (!fs.existsSync(output_path_second)) {
    fs.writeFileSync(
      output_path_second,
      "timestamp,BTCUSDT_price,ETHUSDT_price,ETHUSDT_spread\n"
    );
    //fs.chmod(output_path_second, 666, (err) => {
    //  console.log("changed permissions");
    //});
  }
  console.log("second-write success " + output_path_second);
} catch (err) {
  console.log("second-write error " + output_path_second);
}

// FIX THIS - second
writer_second = csvWriter({
  headers: ["timestamp", "BTCUSDT_price", "ETHUSDT_price", "ETHUSDT_spread"],
  sendHeaders: false,
});
writer_second.pipe(fs.createWriteStream(output_path_second, { flags: "a" }));

let output_path_minute =
  saveDirectory +
  "/minute " +
  new Date().getMonth() +
  " " +
  new Date().getFullYear() +
  ".csv";

try {
  // FIX THIS - minute
  if (!fs.existsSync(output_path_minute)) {
    fs.writeFileSync(
      output_path_minute,
      "timestamp,BTCUSDT_volume,ETHUSDT_volume\n"
    );
    //fs.chmod(output_path_minute, 666, (err) => {
    //  console.log("changed permissions");
    //});
  }
  console.log("minute-write success " + output_path_minute);
} catch (err) {
  console.log("minute-write error " + output_path_minute);
}

// FIX THIS - minute
writer_minute = csvWriter({
  headers: ["timestamp", "BTCUSDT_volume", "ETHUSDT_volume"],
  sendHeaders: false,
});
writer_minute.pipe(fs.createWriteStream(output_path_minute, { flags: "a" }));

// second job
const get_price = () => {
  return axios.get(
    "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
  );
};

const getPriceETH = () => {
  return axios.get(
    "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"
  );
};

const getSpreadETH = () => {
  return axios.get(
    "https://api.binance.com/api/v3/ticker/bookTicker?symbol=ETHUSDT"
  );
};

// minute job
const get_volume = () => {
  return axios.get(
    "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=1&endTime=" +
      (Date.now() - serverTimeInterval - 6000)
  );
};

const getVolumeETH = () => {
  return axios.get(
    "https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1m&limit=1&endTime=" +
      (Date.now() - serverTimeInterval - 6000)
  );
};

// second level job
cron.schedule("* * * * * *", () => {
  // 추후에 다른 심볼 필요하면 쿼리 없애서 전체 받은 다음에 오브젝트 불러다 쓸 것.
  axios
    .all([get_price(), getPriceETH(), getSpreadETH()])
    .then(
      axios.spread((dataPriceBTC, dataPriceETH, dataSpreadETH) => {
        writer_second.write({
          timestamp: Math.round(Date.now() / 1000).toString(),
          BTCUSDT_price: Number.parseFloat(dataPriceBTC.data.price)
            .toFixed(2)
            .toString(),
          ETHUSDT_price: Number.parseFloat(dataPriceETH.data.price)
            .toFixed(2)
            .toString(),
          ETHUSDT_spread: (
            ((Number.parseFloat(dataSpreadETH.data.askPrice) -
              Number.parseFloat(dataSpreadETH.data.bidPrice)) /
              Number.parseFloat(dataPriceETH.data.price)) *
            100
          )
            .toFixed(6)
            .toString(),
        });
      })
    )
    .catch(() => {
      sendEmail("okjinhyuk93@gmail.com", "Second job error", "망해써요");
    });
});

// minute level job
cron.schedule("* * * * *", () => {
  axios
    .all([get_volume(), getVolumeETH()])
    .then(
      axios.spread((dataVolumeBTC, dataVolumeETH) => {
        writer_minute.write({
          timestamp: Math.round(Date.now() / 1000).toString(),
          BTCUSDT_volume: Number.parseFloat(dataVolumeBTC.data[0][5])
            .toFixed(5)
            .toString(),
          ETHUSDT_volume: Number.parseFloat(dataVolumeETH.data[0][5])
            .toFixed(5)
            .toString(),
        });
      })
    )
    .catch(() => {
      sendEmail("okjinhyuk93@gmail.com", "Minute job error", "망해써요");
    });
});

// 10 minute level job

//cron.schedule('0 */10 * * * *',()=>{

//});

// day level job
cron.schedule("30 0 0 * * *", () => {
  writer_second.end();
  output_path_second =
    saveDirectory + "/second " + new Date().toDateString() + ".csv";
  try {
    // FIX THIS - second
    fs.writeFileSync(
      output_path_second,
      "timestamp,BTCUSDT_price,ETHUSDT_price,ETHUSDT_spread\n"
    );
    console.log("wrote file - daily - " + output_path_second);
    fs.chmod(output_path_second, 666, (err) => {
      console.log("changed permissions");
    });
  } catch (err) {
    console.log(output_path_second + " error writing new file");
  }
  // FIX THIS - second
  writer_second = csvWriter({
    headers: ["timestamp", "BTCUSDT_price", "ETHUSDT_price", "ETHUSDT_spread"],
    sendHeaders: false,
  });
  writer_second.pipe(fs.createWriteStream(output_path_second, { flags: "a" }));
});

// month level job

cron.schedule("30 0 0 1 * *", () => {
  writer_minute.end();
  output_path_minute =
    saveDirectory +
    "/minute " +
    new Date().getMonth() +
    " " +
    new Date().getFullYear() +
    ".csv";
  try {
    // FIX THIS - minute
    fs.writeFileSync(
      output_path_minute,
      "timestamp,BTCUSDT_volume,ETHUSDT_volume\n"
    );
    console.log(output_path_minute + " wrote file - monthly");
    fs.chmod(output_path_second, 666, (err) => {
      console.log("changed permissions");
    });
  } catch (err) {
    console.log(output_path_minute + " error writing new file");
  }

  // FIX THIS - minute
  writer_minute = csvWriter({
    headers: ["timestamp", "BTCUSDT_volume", "ETHUSDT_volume"],
    sendHeaders: false,
  });
  writer_minute.pipe(fs.createWriteStream(output_path_minute, { flags: "a" }));
});

// daily upload
cron.schedule("0 3 0 * * *", () => {
  // upload
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    // Authorize a client with credentials, then call the Google Drive API.
    upload.authorize(JSON.parse(content), upload.uploadFile_second);
    console.log("upload.js : uploaded daily file to google drive");
  });
});

// monthly upload
cron.schedule("0 3 0 1 * *", () => {
  // upload
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    // Authorize a client with credentials, then call the Google Drive API.
    upload.authorize(JSON.parse(content), upload.uploadFile_minute);
    console.log("upload.js : uploaded monthly file to google drive");
  });
});

function readline(option) {
  let data = "";
  if (option) {
    data = fs.readFileSync(
      saveDirectory + "/" + "second" + " " + new Date().toDateString() + ".csv"
    );
  } else {
    data = fs.readFileSync(
      saveDirectory +
        "/" +
        "minute" +
        " " +
        new Date().getMonth() +
        " " +
        new Date().getFullYear() +
        ".csv"
    );
  }

  let lines = data.toString().split("\n");

  // application specific calibration
  let count = lines.length - 2;
  return count.toString();
}

function todayInSeconds() {
  let date = new Date();

  // application specific calibration
  return (
    date.getHours() * 3600 +
    date.getMinutes() * 60 +
    date.getSeconds() -
    30
  ).toString();
}

// server

app.set("view engine", "handlebars");
app.engine(
  "handlebars",
  handlebars({
    layoutsDir: __dirname + "/views/layouts",
  })
);

app.use("/tmp", express.static("/tmp"));
app.use(express.static("frontend/build"));
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.render("main", {
    layout: "index",
    test: readline(0) + " " + readline(1) + " expected " + todayInSeconds(),
  });
});
app.listen(PORT, () => {
  console.log("listening");
});
