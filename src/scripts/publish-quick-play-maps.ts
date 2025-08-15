import * as core from "@actions/core";

import { publishQuickPlayMaps } from "../publishQuickPlayMaps.ts";

try {
  core.info("Validating environment variables...");

  const apiUrlLive = process.env.API_URL_LIVE;
  const apiUrlStg = process.env.API_URL_STG;
  const bearerTokenLive = process.env.BEARER_TOKEN_LIVE;
  const bearerTokenStg = process.env.BEARER_TOKEN_STG;

  if (!apiUrlLive || !apiUrlStg || !bearerTokenLive || !bearerTokenStg) {
    throw new Error(
      "Missing required environment variables: API_URL_LIVE, API_URL_STG, BEARER_TOKEN_LIVE, BEARER_TOKEN_STG"
    );
  }

  core.info("Starting to publish quick play maps...");

  await publishQuickPlayMaps({
    live: {
      url: apiUrlLive,
      token: bearerTokenLive,
    },
    stg: {
      url: apiUrlStg,
      token: bearerTokenStg,
    },
  });

  core.info("Successfully published quick play maps.");
} catch (error) {
  if (error instanceof Error) {
    core.setFailed(`Error publishing quick play maps: ${error.message}`);
  } else {
    core.setFailed("An unknown error occurred while publishing quick play maps.");
  }
}
