import {
  backOff,
  type BackoffOptions,
  type IBackOffOptions,
} from "exponential-backoff";

import { logger } from "./logger.ts";

export type EnhancedRequestInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

type SummoningInput = Parameters<typeof fetch>[0];
type SummoningOpts = {
  timeout: number;
  retryUntilOkay: boolean;
  requestInit: Omit<EnhancedRequestInit, "signal">;
  backoffOptions: BackoffOptions;
};
type SummoningResult = ReturnType<typeof fetch>;

export class SummoningError extends Error {
  constructor(public readonly response: Response) {
    super(`Response not okay: ${response.status} - ${response.statusText}`);
  }
}

const defaultOpts: SummoningOpts = {
  timeout: 10_000, // 10 seconds
  retryUntilOkay: false,
  requestInit: {
    next: {
      revalidate: 30,
    },
  },
  backoffOptions: {
    delayFirstAttempt: false,
    numOfAttempts: 3,
    startingDelay: 300,
  },
};

export const makeDefaultOpts = (opts?: Partial<SummoningOpts>): SummoningOpts => ({
  timeout: opts?.timeout ?? defaultOpts.timeout,
  retryUntilOkay: opts?.retryUntilOkay ?? defaultOpts.retryUntilOkay,
  requestInit: {
    ...defaultOpts.requestInit,
    ...opts?.requestInit,
    next: {
      ...defaultOpts.requestInit.next,
      ...opts?.requestInit?.next,
    },
  },
  backoffOptions: {
    ...defaultOpts.backoffOptions,
    ...opts?.backoffOptions,
  },
});

export const makeRequestInit = (
  timeout: number,
  requestInit: SummoningOpts["requestInit"],
): RequestInit => {
  if (requestInit.cache === "no-store") {
    delete requestInit.next?.revalidate;
  }

  return {
    ...requestInit,
    signal: timeout > 0 ? AbortSignal.timeout(timeout) : null,
  };
};

export const urlFromInput = (input: SummoningInput): string =>
  typeof input === "string"
    ? input // ------> if it's a string, use that
    : input instanceof URL
      ? input.href // -> if it's a URL, use the `href`
      : input.url; // -> otherwise, it's a Request, use the `url`

export const makeBackoffOptions = (
  url: string,
  { retry, ...options }: BackoffOptions,
): Pick<IBackOffOptions, "retry"> & Omit<BackoffOptions, "retry"> => ({
  ...options,
  retry: (e, attemptNumber) => {
    const error = e instanceof Error ? e : new Error(String(e));

    logger.warn(
      `fetch attempt ${attemptNumber} to ${url} failed with "${error.message}"`,
      error instanceof SummoningError
        ? { exception: error, response: error.response }
        : { exception: error },
    );

    return retry?.(e, attemptNumber) ?? true;
  },
});

export const summon = (
  input: SummoningInput,
  opts?: Partial<SummoningOpts>,
): SummoningResult => {
  logger.info(`fetch request to ${urlFromInput(input)}`);

  const { timeout, retryUntilOkay, requestInit, backoffOptions } =
    makeDefaultOpts(opts);

  return backOff(
    () =>
      fetch(input, makeRequestInit(timeout, requestInit)).then((response) => {
        if (retryUntilOkay && !response.ok) {
          throw new SummoningError(response);
        }

        return response;
      }),
    makeBackoffOptions(urlFromInput(input), backoffOptions),
  );
};
