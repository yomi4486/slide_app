import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const templatePath = path.resolve(__dirname, "../utils/firebase.js.example");
const outputPath = path.resolve(__dirname, "../utils/firebase.js");

let content = fs.readFileSync(templatePath, "utf8");

const replacements = {
  "__API_KEY__": process.env.apiKey,
  "__AUTH_DOMAIN__": process.env.authDomain,
  "__PROJECT_ID__": process.env.projectId,
  "__STORAGE_BUCKET__": process.env.storageBucket,
  "__MESSAGING_SENDER_ID__": process.env.messagingSenderId,
  "__APP_ID__": process.env.appId,
  "__MEASUREMENT_ID__": process.env.measurementId
};

for (const [key, value] of Object.entries(replacements)) {
  content = content.replace(new RegExp(key, "g"), value);
}

fs.writeFileSync(outputPath, content);
console.log("✅ firebase.js generated successfully.");
