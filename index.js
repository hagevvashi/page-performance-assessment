import { google } from "googleapis";
async function main() {
    const sheets = google.sheets("v4");
    const oauth_token = "foo"; // FIXME: specify valid values later on
    const spreadsheetId = "bar"; // FIXME: specify valid values later on
    const spreadsheet = await sheets.spreadsheets.get({
        oauth_token,
        spreadsheetId,
    });
    console.log(spreadsheet);
}
main();
