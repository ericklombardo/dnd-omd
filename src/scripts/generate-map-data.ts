import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { logger } from "../helpers/logger.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcesFolderPath = path.join(__dirname, "../..", "sources");
const mapDataFilePath = path.join(__dirname, "../..", "official-map-data.json");
const sourceListFilePath = path.join(__dirname, "../..", "source-list.json");

const generateData = () => {
  const sourceList: { [key: string]: boolean } = {};
  const sourceFileNames = fs
    .readdirSync(sourcesFolderPath)
    .filter((fileName) => fileName.endsWith(".json"));

  const sources = sourceFileNames.map((fileName) => {
    const sourceFilePath = path.join(sourcesFolderPath, fileName);
    const source = JSON.parse(fs.readFileSync(sourceFilePath, "utf8"));
    sourceList[source.name] = true;
    return source;
  });

  const jsonData = { sources };
  return {
    jsonData: JSON.stringify(jsonData, null, 2) + "\n",
    sourceList: JSON.stringify(sourceList, null, 2) + "\n",
  };
};

const { jsonData, sourceList } = generateData();

fs.writeFileSync(mapDataFilePath, jsonData, "utf8");
fs.writeFileSync(sourceListFilePath, sourceList, "utf8");

logger.log("JSON data has been generated successfully.");
