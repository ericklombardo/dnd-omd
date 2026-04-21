import sourceList from "../../source-list.json";

export const validateRawSources = (rawSources: string): string[] => {
  if (!rawSources) {
    throw new Error("No sources provided");
  }

  const inputSources = rawSources
    .split(",")
    .map((source) => source.trim())
    .filter((source) => source.length > 0);

  if (!inputSources.length) {
    throw new Error("No sources provided");
  }

  const lowerCaseSources = new Map(
    Object.keys(sourceList).map((key) => [key.toLowerCase(), key]),
  );

  const invalidSources: string[] = [];
  const sources = inputSources.map((source) => {
    const resolvedSource = lowerCaseSources.get(source.toLowerCase());
    if (!resolvedSource) {
      invalidSources.push(source);
      return source;
    }
    return resolvedSource;
  });

  if (invalidSources.length > 0) {
    throw new Error(
      `Invalid source(s) provided: ${invalidSources.join(", ")}. ` +
        `Source names must match entries in source-list.json (case-insensitive).`,
    );
  }

  return sources;
};
