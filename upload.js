const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const cron = require("node-cron");
const sendEmail = require("./util/mail");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/drive"];
const TOKEN_PATH = "token.json";

var exports = (module.exports = {});

/**
 * Create an OAuth2 client with the given credentials, and then execute the given callback function.
 */
exports.authorize = function (credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
};
/**
 * Describe with given media and metaData and upload it using google.drive.create method()
 */

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

exports.uploadFile_second = function (auth) {
  const drive = google.drive({ version: "v3", auth });
  fs.readdir("./data", (err, files) => {
    for (const dirent of files) {
      if (
        dirent.includes("csv") &&
        dirent.includes("second") &&
        !dirent.includes(new Date().toDateString())
      ) {
        const fileMetadata = {
          parents: ["1_7wO08NRLlT5TooopJ3AO6Ypw_l9fNrn"],
          name: dirent,
        };

        const media = {
          mimeType: "text/csv",
          body: fs.createReadStream("data/" + dirent),
        };

        drive.files.create(
          {
            resource: fileMetadata,
            media: media,
            fields: "id",
          },
          (err, file) => {
            if (err) {
              // Handle error
              sendEmail(
                "okjinhyuk93@gmail.com",
                "File upload error :" + new Date().toString(),
                err
              );
            } else {
              fs.unlink("data/" + dirent, (err) => {
                if (err) {
                  console.log("del err");
                }
              });
              console.log("successfully uploaded current snapshot. " + dirent);
            }
          }
        );
      }
    }
  });
};

exports.uploadFile_minute = function (auth) {
  const drive = google.drive({ version: "v3", auth });
  fs.readdir("./data", (err, files) => {
    for (const dirent of files) {
      if (
        dirent.includes("csv") &&
        dirent.includes("minute") &&
        !dirent.includes(new Date().toDateString())
      ) {
        const fileMetadata = {
          parents: ["1_7wO08NRLlT5TooopJ3AO6Ypw_l9fNrn"],
          name: dirent,
        };

        const media = {
          mimeType: "text/csv",
          body: fs.createReadStream("data/" + dirent),
        };

        drive.files.create(
          {
            resource: fileMetadata,
            media: media,
            fields: "id",
          },
          (err, file) => {
            if (err) {
              // Handle error
              sendEmail(
                "okjinhyuk93@gmail.com",
                "File upload error :" + new Date().toString(),
                err
              );
            } else {
              fs.unlink("data/" + dirent, (err) => {
                if (err) {
                  console.log("del err");
                }
              });
              console.log("successfully uploaded current snapshot. " + dirent);
            }
          }
        );
      }
    }
  });
};
/*
// Daily job
cron.schedule('0 3 0 * * *', ()=>{
  console.log('upload.js : daily upload job triggered');
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    authorize(JSON.parse(content), uploadFile_second);
    console.log('upload.js : uploaded daily file to google drive');
  });
});

// Monthly job
cron.schedule('0 3 0 1 * *',()=>{
  console.log('upload.js : monthly upload job triggered');
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    authorize(JSON.parse(content), uploadFile_minute);
    console.log('upload.js : uploaded monthly file to google drive');
  });
});
*/
