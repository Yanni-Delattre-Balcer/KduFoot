const i18next = require("i18next");
const fs = require("fs");
const path = require("path");

const frFR = JSON.parse(fs.readFileSync(path.join(__dirname, "src/locales/kdufoot/fr-FR.json"), "utf8"));

i18next.init({
  lng: "fr-FR",
  resources: {
    "fr-FR": {
      translation: frFR
    }
  }
});

console.log("withdraw_match:", i18next.t("match.withdraw_match"));
console.log("withdraw_tournament:", i18next.t("match.withdraw_tournament"));
