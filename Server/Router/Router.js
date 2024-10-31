const express = require("express");
const multer = require("multer");
const { ImageAnnotatorClient } = require("@google-cloud/vision");
const base64 = require("base-64");
const _ = require("lodash");
const fs = require("fs");
const similarity = require("string-similarity-js");
const stringSimilarity = similarity.stringSimilarity;
require("dotenv").config();
const nlp = require('compromise');

// Decode credentials from environment variables
const GCP_CLIENT_EMAIL = process.env.GCP_CLIENT_EMAIL;
const GCP_PRIVATE_KEY = process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n");

// Initialize the Google Vision API client
const client = new ImageAnnotatorClient({
  credentials: {
    client_email: GCP_CLIENT_EMAIL,
    private_key: GCP_PRIVATE_KEY,
  },
});

const app = express();
const router = express.Router();
const upload = multer({ dest: "uploads/" });

app.use(express.json());

const RegexExp = {
  patternForDate:
    /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(0[1-9]|[1-2][0-9]|3[0-1])\s(0?[1-9]|1[0-2])\s([0-9]{4}$)$|^((0[1-9]|[1-2][0-9]|3[0-1])\s(0[1-9]|1[0-2])\s([0-9]{4})$|(([0-2][0-9])|([3][0-1]))\ (.*[a-z]){3}\ (\d{2}$|\d{4}$))|\d{2}\/\d{2}\/\d{4}$/gi,
  backSide: /PIN|Name of Spouse|File No/gi,
  frontSide: /PASSPORT/gi,
  alphabet: /[A-Z]/gi,
  space: / /gi,
  nonAlphaNumericAtEitherEnds: /^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g,
  guardian: /Father|Legal/gi,
  mother: /Mother/gi,
  spouse: /Spouse/gi,
  address: /Address/gi,
  pin: /PIN/gi,
  fileID: /^[a-zA-Z]{2}[a-zA-Z0-9]{11}[0-9]{2}$/gi,
};

const countryCodeMapping = {
  AFG: "Afghanistan",
  ALA: "Åland Islands",
  ALB: "Albania",
  DZA: "Algeria",
  ASM: "American Samoa",
  AND: "Andorra",
  AGO: "Angola",
  AIA: "Anguilla",
  ATA: "Antarctica",
  ATG: "Antigua and Barbuda",
  ARG: "Argentina",
  ARM: "Armenia",
  ABW: "Aruba",
  AUS: "Australia",
  AUT: "Austria",
  AZE: "Azerbaijan",
  BHS: "Bahamas",
  BHR: "Bahrain",
  BGD: "Bangladesh",
  BRB: "Barbados",
  BLR: "Belarus",
  BEL: "Belgium",
  BLZ: "Belize",
  BEN: "Benin",
  BMU: "Bermuda",
  BTN: "Bhutan",
  BOL: "Bolivia (Plurinational State of)",
  BES: "Bonaire, Sint Eustatius and Saba",
  BIH: "Bosnia and Herzegovina",
  BWA: "Botswana",
  BVT: "Bouvet Island",
  BRA: "Brazil",
  IOT: "British Indian Ocean Territory",
  BRN: "Brunei Darussalam",
  BGR: "Bulgaria",
  BFA: "Burkina Faso",
  BDI: "Burundi",
  CPV: "Cabo Verde",
  KHM: "Cambodia",
  CMR: "Cameroon",
  CAN: "Canada",
  CYM: "Cayman Islands",
  CAF: "Central African Republic",
  TCD: "Chad",
  CHL: "Chile",
  CHN: "China",
  CXR: "Christmas Island",
  CCK: "Cocos (Keeling) Islands",
  COL: "Colombia",
  COM: "Comoros",
  COG: "Congo",
  COD: "Congo, Democratic Republic of the",
  COK: "Cook Islands",
  CRI: "Costa Rica",
  CIV: "Côte d'Ivoire",
  HRV: "Croatia",
  CUB: "Cuba",
  CUW: "Curaçao",
  CYP: "Cyprus",
  CZE: "Czechia",
  DNK: "Denmark",
  DJI: "Djibouti",
  DMA: "Dominica",
  DOM: "Dominican Republic",
  ECU: "Ecuador",
  EGY: "Egypt",
  SLV: "El Salvador",
  GNQ: "Equatorial Guinea",
  ERI: "Eritrea",
  EST: "Estonia",
  SWZ: "Eswatini",
  ETH: "Ethiopia",
  FLK: "Falkland Islands (Malvinas)",
  FRO: "Faroe Islands",
  FJI: "Fiji",
  FIN: "Finland",
  FRA: "France",
  GUF: "French Guiana",
  PYF: "French Polynesia",
  ATF: "French Southern Territories",
  GAB: "Gabon",
  GMB: "Gambia",
  GEO: "Georgia",
  DEU: "Germany",
  GHA: "Ghana",
  GIB: "Gibraltar",
  GRC: "Greece",
  GRL: "Greenland",
  GRD: "Grenada",
  GLP: "Guadeloupe",
  GUM: "Guam",
  GTM: "Guatemala",
  GGY: "Guernsey",
  GIN: "Guinea",
  GNB: "Guinea-Bissau",
  GUY: "Guyana",
  HTI: "Haiti",
  HMD: "Heard Island and McDonald Islands",
  VAT: "Holy See",
  HND: "Honduras",
  HKG: "Hong Kong",
  HUN: "Hungary",
  ISL: "Iceland",
  IND: "India",
  IDN: "Indonesia",
  IRN: "Iran (Islamic Republic of)",
  IRQ: "Iraq",
  IRL: "Ireland",
  IMN: "Isle of Man",
  ISR: "Israel",
  ITA: "Italy",
  JAM: "Jamaica",
  JPN: "Japan",
  JEY: "Jersey",
  JOR: "Jordan",
  KAZ: "Kazakhstan",
  KEN: "Kenya",
  KIR: "Kiribati",
  PRK: "Korea (Democratic People's Republic of)",
  KOR: "Korea, Republic of",
  KWT: "Kuwait",
  KGZ: "Kyrgyzstan",
  LAO: "Lao People's Democratic Republic",
  LVA: "Latvia",
  LBN: "Lebanon",
  LSO: "Lesotho",
  LBR: "Liberia",
  LBY: "Libya",
  LIE: "Liechtenstein",
  LTU: "Lithuania",
  LUX: "Luxembourg",
  MAC: "Macao",
  MDG: "Madagascar",
  MWI: "Malawi",
  MYS: "Malaysia",
  MDV: "Maldives",
  MLI: "Mali",
  MLT: "Malta",
  MHL: "Marshall Islands",
  MTQ: "Martinique",
  MRT: "Mauritania",
  MUS: "Mauritius",
  MYT: "Mayotte",
  MEX: "Mexico",
  FSM: "Micronesia (Federated States of)",
  MDA: "Moldova, Republic of",
  MCO: "Monaco",
  MNG: "Mongolia",
  MNE: "Montenegro",
  MSR: "Montserrat",
  MAR: "Morocco",
  MOZ: "Mozambique",
  MMR: "Myanmar",
  NAM: "Namibia",
  NRU: "Nauru",
  NPL: "Nepal",
  NLD: "Netherlands",
  NCL: "New Caledonia",
  NZL: "New Zealand",
  NIC: "Nicaragua",
  NER: "Niger",
  NGA: "Nigeria",
  NIU: "Niue",
  NFK: "Norfolk Island",
  MKD: "North Macedonia",
  MNP: "Northern Mariana Islands",
  NOR: "Norway",
  OMN: "Oman",
  PAK: "Pakistan",
  PLW: "Palau",
  PSE: "Palestine, State of",
  PAN: "Panama",
  PNG: "Papua New Guinea",
  PRY: "Paraguay",
  PER: "Peru",
  PHL: "Philippines",
  PCN: "Pitcairn",
  POL: "Poland",
  PRT: "Portugal",
  PRI: "Puerto Rico",
  QAT: "Qatar",
  REU: "Réunion",
  ROU: "Romania",
  RUS: "Russian Federation",
  RWA: "Rwanda",
  BLM: "Saint Barthélemy",
  SHN: "Saint Helena, Ascension and Tristan da Cunha",
  KNA: "Saint Kitts and Nevis",
  LCA: "Saint Lucia",
  MAF: "Saint Martin (French part)",
  SPM: "Saint Pierre and Miquelon",
  VCT: "Saint Vincent and the Grenadines",
  WSM: "Samoa",
  SMR: "San Marino",
  STP: "Sao Tome and Principe",
  SAU: "Saudi Arabia",
  SEN: "Senegal",
  SRB: "Serbia",
  SYC: "Seychelles",
  SLE: "Sierra Leone",
  SGP: "Singapore",
  SXM: "Sint Maarten (Dutch part)",
  SVK: "Slovakia",
  SVN: "Slovenia",
  SLB: "Solomon Islands",
  SOM: "Somalia",
  ZAF: "South Africa",
  SGS: "South Georgia and the South Sandwich Islands",
  SSD: "South Sudan",
  ESP: "Spain",
  LKA: "Sri Lanka",
  SDN: "Sudan",
  SUR: "Suriname",
  SJM: "Svalbard and Jan Mayen",
  SWE: "Sweden",
  CHE: "Switzerland",
  SYR: "Syrian Arab Republic",
  TWN: "Taiwan, Province of China",
  TJK: "Tajikistan",
  TZA: "Tanzania, United Republic of",
  THA: "Thailand",
  TLS: "Timor-Leste",
  TGO: "Togo",
  TKL: "Tokelau",
  TON: "Tonga",
  TTO: "Trinidad and Tobago",
  TUN: "Tunisia",
  TUR: "Turkey",
  TKM: "Turkmenistan",
  TCA: "Turks and Caicos Islands",
  TUV: "Tuvalu",
  UGA: "Uganda",
  UKR: "Ukraine",
  ARE: "United Arab Emirates",
  GBR: "United Kingdom of Great Britain and Northern Ireland",
  USA: "United States of America",
  UMI: "United States Minor Outlying Islands",
  URY: "Uruguay",
  UZB: "Uzbekistan",
  VUT: "Vanuatu",
  VEN: "Venezuela (Bolivarian Republic of)",
  VNM: "Viet Nam",
  VGB: "Virgin Islands (British)",
  VIR: "Virgin Islands (U.S.)",
  WLF: "Wallis and Futuna",
  ESH: "Western Sahara",
  YEM: "Yemen",
  ZMB: "Zambia",
  ZWE: "Zimbabwe",
};

const monthMapping = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  june: "06",
  july: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ error: "No file uploaded" });
    }
    const base64 = fs.readFileSync(req.file.path).toString("base64");
    const result = await extractTextFromImageBuffer(base64);
    fs.unlinkSync(req.file.path);
    res.send(result);
  } catch (error) {
    console.error("Error:", error);
    res.send({ error: error.message });
  }
});

router.post("/base", async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).send({ error: "No file uploaded" });
    }
    const result = await extractTextFromImageBuffer(req.body.image);
    res.send(result);
  } catch (error) {
    console.error("Error:", error);
    res.send({ error: error.message });
  }
});

module.exports = router;

async function extractTextFromImageBuffer(base64) {
  try {
    const request = {
      image: {
        content: base64,
      },
      imageContext: {
        languageHints: ["en"],
      },
    };
    console.log(`started extracting text from image buffer`);
    return getPassportDataFromRequestType(request);
  } catch (error) {
    console.error(error.message);
    return {
      status: false,
      data: {},
      message: error.message,
    };
  }
}

async function getPassportDataFromRequestType(request) {
  try {
    const result = await client.textDetection(request);
    const textResult = _.get(result, "[0].textAnnotations[0].description", "");
    console.log(`got the text result from google vision ocr`);
    let textResultArray = textResult.split("\n");
    if (JSON.stringify(textResult).search(RegexExp.backSide) !== -1) {
      console.log("started extracting data from ocr text for back side");
      const backSideDetails = getBackSideData(textResultArray);
      return {
        status: true,
        data: backSideDetails,
        message: "",
      };
    } else if (JSON.stringify(textResult).search(RegexExp.frontSide) !== -1) {
      console.log("started extracting data from ocr text for front side");
      const frontSideDetails = getFrontSideData(textResultArray);
      return {
        status: true,
        data: frontSideDetails,
        message: "",
      };
    }
    console.log(
      `image is invalid as the ocr text don't consist PASSPORT or PIN|Name of Spouse|File No`
    );
    return {
      status: false,
      data: {},
      message: "invalid or blurred image",
    };
  } catch (error) {
    console.error(
      `failed to extract text by google vision ocr from image buffer`,
      error.message
    );
    return {
      status: false,
      data: {},
      message: error.message,
    };
  }
}

function getFrontSideData(textResultArray) {
  try {
    let rawNameAndPassportDetailsArray = textResultArray
      .filter(
        (rawStr) => rawStr.search("<") != -1 && rawStr.match(RegexExp.alphabet)
      )
      .map((rawStr) => rawStr.replace(RegexExp.space, ""));

    const rawStringName = _.get(
      rawNameAndPassportDetailsArray,
      `${[rawNameAndPassportDetailsArray.length - 2]}`,
      ""
    );
    const rawStringPassportDetails = _.get(
      rawNameAndPassportDetailsArray,
      `${[rawNameAndPassportDetailsArray.length - 1]}`,
      ""
    );
    const nameAndType = getNameOfPassportHolder(rawStringName);
    const passportDetails = getPassportDetails(rawStringPassportDetails);
    const date = getDateMethod1(textResultArray, rawStringPassportDetails);
    console.log(`completed extracting front side data of passport`);
    return {
      ...nameAndType,
      ...passportDetails,
      ...date,
    };
  } catch (error) {
    console.error("failed to extract back side data of passport");
    return error.message;
  }
}

function getPassportDetails(rawString) {
  const passportNumber = rawString.substring(0, 9);
  const countryCode = rawString.substring(10, 13).toUpperCase();
  const country = _.get(countryCodeMapping, `${countryCode}`, "");
  const gender = rawString.substring(20, 21);
  console.log("got details like passportNumber countryCode country and gender");
  return {
    passportNumber: removeUnwantedStrings(passportNumber),
    country,
    countryCode,
    gender,
  };
}

function getNameOfPassportHolder(rawNameAndTypeCapturedFrontSide) {
  const type = rawNameAndTypeCapturedFrontSide.substring(0, 1);
  const name = getSurnameAndNameOfPassportHolder(
    rawNameAndTypeCapturedFrontSide.substring(
      5,
      rawNameAndTypeCapturedFrontSide.length
    )
  );
  console.log("got details like type and name");
  return { type, name };
}

function getSurnameAndNameOfPassportHolder(str) {
  const firstIndex = str.indexOf("<");
  const surname = str.substring(0, firstIndex);
  const name = str.substring(firstIndex, str.length);
  const fullName = `${removeUnwantedStrings(name)} ${removeUnwantedStrings(
    surname
  )}`;
  console.log("converted surname and name to full name");
  return fullName;
}

function getDateMethod1(textResultArray, rawStringPassportDetails) {
  let dateCollectionMethod1 = [];
  let dateCollectionMethod2 = [];

  let requiredDate = { dob: "", doi: "", doe: "" };

  for (
    let extractedRawStr = 0;
    extractedRawStr < textResultArray.length;
    extractedRawStr++
  ) {
    textResultArray[extractedRawStr] = textResultArray[extractedRawStr].replace(
      RegexExp.nonAlphaNumericAtEitherEnds,
      ""
    );
    const regexResponse = textResultArray[extractedRawStr].match(
      RegexExp.patternForDate
    );
    if (regexResponse) {
      dateCollectionMethod1.push(_.get(regexResponse, "[0]", ""));
    }
  }
  dateCollectionMethod1 = removeDuplicatesFromArr(
    dateCollectionMethod1.map((el) => el.toLowerCase())
  );

  if (dateCollectionMethod1.length !== 3) {
    dateCollectionMethod2 = getDateMethod2(textResultArray);
  }
  if (dateCollectionMethod1.length === 3) {
    const sortedDate = sortDate(dateCollectionMethod1);
    const [dob, doi, doe] = sortedDate;
    requiredDate = { ...requiredDate, dob, doi, doe };
    console.log(`got date via method 1 as ${JSON.stringify(requiredDate)}`);
  } else if (dateCollectionMethod2.length == 3) {
    const sortedDate = sortDate(dateCollectionMethod2);
    const [dob, doi, doe] = sortedDate;
    requiredDate = { ...requiredDate, dob, doi, doe };
    console.log(`got date via method 2 as ${JSON.stringify(requiredDate)}`);
  } else {
    const dob = rawStringPassportDetails.substring(13, 19);
    const doe = rawStringPassportDetails.substring(21, 27);
    requiredDate = { ...requiredDate, dob, doe };
  }

  for (const key in requiredDate) {
    requiredDate[key] = formatDate(requiredDate[key]);
  }
  if (+requiredDate.dob > 2023) {
    requiredDate.dob = (+requiredDate.dob - 100).toString();
  }
  console.log(`got final required date as ${JSON.stringify(requiredDate)}`);
  return requiredDate;
}

function getDateMethod2(textResultArray) {
  let dateCollected = [];
  for (let rawString = 0; rawString < textResultArray.length; rawString++) {
    let regexResponse = textResultArray[rawString].match(
      RegexExp.patternForDate
    );
    if (regexResponse === null) {
      let combinedString =
        textResultArray[rawString] + " " + textResultArray[rawString + 1];
      let regexResponseOfCombinedStr = combinedString.match(
        RegexExp.patternForDate
      );
      if (regexResponseOfCombinedStr) {
        dateCollected.push(_.get(regexResponseOfCombinedStr, "[0]", ""));
        rawString++;
      }
    }
    if (regexResponse === null) {
      let combinedString =
        textResultArray[rawString] +
        " " +
        textResultArray[rawString + 1] +
        " " +
        textResultArray[rawString + 2];
      let regexResponseOfCombinedStr = combinedString.match(
        RegexExp.patternForDate
      );
      if (regexResponseOfCombinedStr) {
        dateCollected.push(_.get(regexResponseOfCombinedStr, "[0]", ""));
        rawString += 2;
      }
    }
  }

  dateCollected = removeDuplicatesFromArr(dateCollected);

  if (dateCollected.length === 3) {
    return dateCollected;
  }
  console.log(`got date via method 2 as ${JSON.stringify(dateCollected)}`);
  return dateCollected;
}

function getBackSideData(textResultArray) {
  try {
    const backSideDetails = {
      fatherName: "",
      motherName: "",
      nameOfSpouse: "",
      address: "",
      fileID: "",
    };

    const dataBool = {
      fatherNameBool: true,
      motherNameBool: true,
      nameOfSpouseBool: true,
      addressBool: true,
      fileIDBool: true,
    };
    const {
      fatherNameBool = true,
      motherNameBool = true,
      nameOfSpouseBool = true,
      addressBool = true,
      fileIDBool = true,
    } = dataBool;

    for (let i = 0; i < textResultArray.length; i++) {
      if (
        fatherNameBool &&
        textResultArray[i].search(RegexExp.guardian) !== -1
      ) {
        dataBool.fatherNameBool = false;
        backSideDetails.fatherName = removeUnwantedStringAtEitherEnds(
          detectNames(textResultArray[i + 1],textResultArray[i + 2])
        );
        i++;
      }
      if (motherNameBool && textResultArray[i].search(RegexExp.mother) !== -1) {
        dataBool.motherNameBool = false;
        backSideDetails.motherName = removeUnwantedStringAtEitherEnds(
          detectNames(textResultArray[i + 1],textResultArray[i + 2])
        );
        i++;
      }
      if (
        nameOfSpouseBool &&
        textResultArray[i].search(RegexExp.spouse) !== -1
      ) {
        dataBool.nameOfSpouseBool = true;
        if (textResultArray[i + 1].search(/Address|,/gi) !== -1) {
        } else {
          backSideDetails.nameOfSpouse = removeUnwantedStringAtEitherEnds(
            textResultArray[i + 1]
          );
          i++;
        }
      }
      if (addressBool && textResultArray[i].search(RegexExp.address) !== -1) {
        backSideDetails.address =
          removeUnwantedStringAtEitherEnds(textResultArray[i + 1]) +
          " " +
          removeUnwantedStringAtEitherEnds(textResultArray[i + 2]) +
          " " +
          removeUnwantedStringAtEitherEnds(textResultArray[i + 3]);
        if (
          textResultArray[i].search(RegexExp.pin) !== -1 &&
          +textResultArray[i].match(/\d{6}/) !== 1
        ) {
          dataBool.addressBool = false;
        }
      }

      if (
        addressBool &&
        textResultArray[i].search(RegexExp.pin) !== -1 &&
        textResultArray[i].match(/\d{6}/) !== null
      ) {
        dataBool.addressBool = false;
        backSideDetails.address =
          removeUnwantedStringAtEitherEnds(textResultArray[i - 2]) +
          " " +
          removeUnwantedStringAtEitherEnds(textResultArray[i - 1]) +
          " " +
          removeUnwantedStringAtEitherEnds(textResultArray[i]);
      }

      if (fileIDBool && textResultArray[i].match(RegexExp.fileID)) {
        dataBool.fileIDBool = false;
        let ddd = textResultArray[i].match(RegexExp.fileID);
        backSideDetails.fileID = ddd[0];
      }
    }
    console.log(`completed extracting back side data of passport`);
    return backSideDetails;
  } catch (error) {
    console.error("failed to extract back side data of passport");
    return error.message;
  }
}

function removeUnwantedStrings(rawString) {
  const desiredString = rawString
    .replace(/</g, " ")
    .split(" ")
    .filter((el) => el !== "")
    .join(" ");
  return desiredString;
}

function removeDuplicatesFromArr(arr) {
  return arr.filter((item, index) => arr.indexOf(item) === index);
}

function formatDate(date) {
  if (!date) return date;
  if (date.length === 6) {
    const datearr = date.match(/.{1,2}/g);
    let [year, month, day] = datearr;
    return `${day}/${month}/${formatYear(year)}`;
  }

  const splittedDate = date.split(/[./" "]/).filter((el) => el !== "");
  const day = _.get(splittedDate, "[0]", "");
  let monthFormat1 = _.get(splittedDate, "[1]", "");
  const monthFormat2 = _.get(splittedDate, "[2]", "");
  const year = _.get(splittedDate, `${[splittedDate.length - 1]}`, "");

  if (isNaN(monthFormat1)) {
    if (
      [monthFormat1, monthFormat2].includes(
        "mai" || "mae" || "meie" || "maio" || "mei" || "मई" || "mey" || "may"
      )
    ) {
      return `${day}/${monthMapping["may"]}/${formatYear(year)}`;
    }
    let max = 0;
    let letter = "";

    for (let monthName in monthMapping) {
      var similarity1 = stringSimilarity(monthName, monthFormat1);
      var similarity2 = stringSimilarity(monthName, monthFormat2);
      if (similarity1 > max || similarity2 > max) {
        max = Math.max(similarity1, similarity2);
        letter = monthName;
      }
    }
    return `${day}/${monthMapping[letter]}/${formatYear(year)}`;
  }
  return `${day}/${monthFormat1}/${formatYear(year)}`;
}

function formatYear(year) {
  if (year.length == 4) {
    year = year;
  } else if (+year < 50) {
    year = `20${year}`;
  } else {
    year = `19${year}`;
  }
  return year;
}

function sortDate(collectedDateArr) {
  return collectedDateArr.sort((date1, date2) => {
    let date1arr = date1.split(/[./" "]/);
    const year1 = formatYear(date1arr[date1arr.length - 1]);

    let date2arr = date2.split(/[./" "]/);
    const year2 = formatYear(date2arr[date2arr.length - 1]);

    if (year1 < year2) return -1;
    if (year1 > year2) return 1;
    if (year1 == year2) return 0;
  });
}

function removeUnwantedStringAtEitherEnds(str) {
  str = str?.trim(); //remove any starting and last white spaces
  str = str?.replace(RegexExp.nonAlphaNumericAtEitherEnds, ""); //remove any starting and last special charcters
  return str;
}

function detectNames(word1, word2) {
  const words = [word1, word2];
  for (const word of words) {
      const doc = nlp(word);
      if (doc.people().out('array').length > 0) {
          return word; // Return the first detected name
      }
  }
  return null; // Return null if no name is found
}