import { execSync } from "node:child_process";
import path from "node:path";
import fs from "fs";

import * as core from "@actions/core";
import { BackoffOptions } from "exponential-backoff";

import { summon } from "../helpers/summon.ts";


const backoffOptions: BackoffOptions = {
  numOfAttempts: 3,
  startingDelay: 500,
  timeMultiple: 2,
};

const getChangedSourceFiles = (): {
  changedFiles: string[];
  deletedFiles: string[];
} => {
  core.info("Checking for changed source files...");

  // Get a list of changed files with their status (Added, Modified, Deleted)
  const gitCommand = "git diff --name-status HEAD~1 HEAD -- sources/*.json";
  const gitOutput = execSync(gitCommand, { encoding: 'utf-8' }).trim();

  if (!gitOutput) {
    core.info("No source files have changed");
    return {
      changedFiles: [],
      deletedFiles: [],
    };
  }

  const lines = gitOutput.split('\n');

  const changedFiles: string[] = [];
  const deletedFiles: string[] = [];

  lines.forEach(line => {
    const [status, filePath] = line.split('\t');

    if (filePath && filePath.startsWith('sources/') && filePath.endsWith('.json')) {
      if (status === 'D') {
        // File was deleted
        deletedFiles.push(filePath);
      } else if (['A', 'M', 'R'].includes(status)) {
        // File was Added, Modified, or Renamed - these we can deploy
        changedFiles.push(filePath);
      }
    }
  });

  if (deletedFiles.length > 0) {
    core.info(`Found ${deletedFiles.length} deleted source files`);
  }

  if (changedFiles.length > 0) {
    core.info(`Found ${changedFiles.length} changed source files to deploy`);
  }

  return {
    changedFiles,
    deletedFiles,
  };
};

const loadSourceData = (filePath: string) => {
  const fullPath = path.resolve(filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist: ${fullPath}`);
  }

  const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  core.info(`Loaded source data from: ${filePath}`);
  return data;
};

const deployData = async (url: string, token: string) => {
  const { changedFiles, deletedFiles } = getChangedSourceFiles();
  if (changedFiles.length === 0 && deletedFiles.length === 0) {
    core.info("No source files to deploy.");
    return;
  }

  const sources = changedFiles.map(file => {
    core.info(`Loading source data from: ${file}`);
    return loadSourceData(file);
  });
  const sourcesToDelete = deletedFiles.map(file => {
    core.info(`Loading source data to delete from: ${file}`);
    return path.basename(file, '.json')
  });

  const response = await summon(`${url}/admin/sources`, {
    requestInit: {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sources,
        sourcesToDelete,
        partialUpdate: true,
      })
    },
    timeout: 0, // No timeout
    backoffOptions,
  });

  if (response.ok) return;

  const contentType = response.headers.get("content-type");
  let errorMessage = `API returned ${response.status}`;

  if (contentType && contentType.includes("application/json")) {
    const errorResponse = await response.json();
    errorMessage = errorResponse.error || errorMessage;
  } else {
    const errorText = await response.text();
    errorMessage = `Non-JSON response body: ${errorText}`;
  }

  throw new Error(errorMessage);
};

try {
  core.info("Validating environment variables...");

  const url = process.env.API_URL;
  const token = process.env.BEARER_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Error: One or more environment variables are not defined"
    );
  }

  core.info("Starting to deploy data...");
  await deployData(url, token);
  core.info("Data deployed successfully.");
} catch (error) {
  if (error instanceof Error) {
    core.setFailed(`Failed to deploy data after ${backoffOptions.numOfAttempts} attempts: ${error.message}`);
  } else {
    core.setFailed("Failed to deploy data after ${backoffOptions.numOfAttempts} attempts");
  }
}
