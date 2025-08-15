import * as core from "@actions/core";
import { BackoffOptions } from "exponential-backoff";

import { summon } from "./helpers/summon.ts";

type ApiInput = {
  url: string;
  token: string;
};

type PublishParams = {
  live: ApiInput;
  stg: ApiInput;
};

const backoffOptions: BackoffOptions = {
  numOfAttempts: 5,
  startingDelay: 500,
  timeMultiple: 2,
};

export const publishQuickPlayMaps = async (input: PublishParams) => {
  const { live, stg } = input;

  const response = await summon(`${stg.url}/admin/prepared-maps`, {
    requestInit: {
      method: "GET",
      headers: {
        Authorization: `Bearer ${stg.token}`,
        "Content-Type": "application/json",
      },
    },
    timeout: 20_000, // 20 seconds
    backoffOptions,
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch prepared maps from staging: ${response.status} ${response.statusText}`
    );
  }
  const maps = await response.json();
  const preparedMaps = {
    preparedMaps: maps.data,
  };

  core.info(`Fetched ${preparedMaps.preparedMaps.length} prepared maps from staging.`);

  core.info("Publishing prepared maps to live...");

  const publishResponse = await summon(`${live.url}/admin/prepared-maps`, {
    requestInit: {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${live.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preparedMaps),
    },
    timeout: 60_000, // 1 minute
    backoffOptions,
  });

  if (!publishResponse.ok) {
    throw new Error(
      `Failed to publish prepared maps to live: ${publishResponse.status} ${publishResponse.statusText}`
    );
  }
};
