import * as core from "@actions/core";

import { publishQuickPlayMaps } from "../publishQuickPlayMaps.ts";
import { validateRawSources } from "../helpers/validate-raw-sources.ts";

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

  core.info("Validating sources input...");
  const sources = validateRawSources(process.env.SOURCES ?? "");

  core.info("Starting to publish quick play maps...");
  core.info(`Publishing maps for sources: ${sources.join(", ")}`);

  await publishQuickPlayMaps({
    live: {
      url: apiUrlLive,
      token: bearerTokenLive,
    },
    stg: {
      url: apiUrlStg,
      token: bearerTokenStg,
    },
    sources,
  });

  core.info("Successfully published quick play maps.");
} catch (error) {
  if (error instanceof Error) {
    core.setFailed(`Error publishing quick play maps: ${error.message}`);
  } else {
    core.setFailed("An unknown error occurred while publishing quick play maps.");
  }
}
