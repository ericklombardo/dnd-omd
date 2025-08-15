import { readFileSync } from "fs";
import { join } from "path";

import { Validator } from "jsonschema";

import type { OfficialMapData } from "@/src/types";

// Get the Json file
const filePath = join(__dirname, "..", "official-map-data.json");
const jsonContent = readFileSync(filePath, "utf8");
const json: OfficialMapData = JSON.parse(jsonContent);

const schemaPath = join(__dirname, "..", "official-map-data.schema.json");
const schemaContent = readFileSync(schemaPath, "utf8");
const schema = JSON.parse(schemaContent);

const validator = new Validator();

const isValidS3KeyFormat = (key: string) => {
  const s3KeyPattern = /^(?!\/)(?!.*\/$)(?!.*\/\/)(?!.*\\).{1,1024}\/.*$/;
  const urlPattern = /^(http:|https:|s3:|arn:)/i;

  return s3KeyPattern.test(key) && !urlPattern.test(key);
};

describe("JSON Schema Validation", () => {
  test("JSON data should adhere to the schema", () => {
    const validationResult = validator.validate(json, schema);
    expect(validationResult.errors).toEqual([]);
  });
});

describe("Sources", () => {
  test("sources is the root object", () => {
    expect(json).toHaveProperty("sources");
  });

  test("source type is valid", () => {
    const validTypes = ["sourcebook", "adventure", "basic", "mappack"];

    for (const source of json.sources) {
      expect(validTypes).toContain(source.type);
    }
  });

  test("source name is unique", () => {
    const sourceNames = new Set();

    for (const source of json.sources) {
      const sourceName = source.name.toLowerCase();
      expect(sourceNames).not.toContain(sourceName);
      sourceNames.add(sourceName);
    }
  });
});

describe("Sources > Chapters", () => {
  test("chapters should not be an empty array", () => {
    for (const source of json.sources) {
      expect(source).toHaveProperty("chapters");
      expect(Array.isArray(source.chapters)).toBeTruthy();
      expect(source.chapters.length).toBeGreaterThan(0);
    }
  });

  test("chapter IDs should be unique per source", () => {
    for (const source of json.sources) {
      const chapterIds = new Set();

      for (const chapter of source.chapters) {
        const chapterId = chapter.id;
        expect(chapterIds).not.toContain(chapterId);
        chapterIds.add(chapterId);
      }
    }
  });

  test("chapter orders should not overlap per source", () => {
    for (const source of json.sources) {
      const chapterOrders = new Set();

      for (const chapter of source.chapters) {
        const chapterOrder = chapter.order;
        expect(typeof chapterOrder === "number").toBeTruthy();
        expect(chapterOrders).not.toContain(chapterOrder);
        chapterOrders.add(chapterOrder);
      }
    }
  });
});

describe("Sources > Chapters > Maps", () => {
  test("maps should not be an empty array", () => {
    for (const source of json.sources) {
      for (const chapter of source.chapters) {
        expect(chapter).toHaveProperty("maps");
        expect(Array.isArray(chapter.maps)).toBeTruthy();
        expect(chapter.maps.length).toBeGreaterThan(0);
      }
    }
  });

  test("maps orders should not overlap per chapter", () => {
    for (const source of json.sources) {
      for (const chapter of source.chapters) {
        const mapOrders = new Set();

        for (const map of chapter.maps) {
          const mapOrder = map.order;
          expect(typeof mapOrder === "number").toBeTruthy();
          expect(mapOrders).not.toContain(mapOrder);
          mapOrders.add(mapOrder);
        }
      }
    }
  });

  test("maps tokenScale should be between 0 and 1", () => {
    for (const source of json.sources) {
      for (const chapter of source.chapters) {
        for (const map of chapter.maps) {
          const tokenScale = map.tokenScale;
          expect(typeof tokenScale === "number").toBeTruthy();
          expect(tokenScale).toBeGreaterThan(0);
          expect(tokenScale).toBeLessThan(1);
        }
      }
    }
  });
});

describe("Validate S3 Keys", () => {
  json.sources.map((source) => {
    test(`${source.name}: backgroundImageKey should be a valid S3 key`, async () => {
      try {
        expect(isValidS3KeyFormat(source.backgroundImageKey)).toBe(true);
      } catch (error) {
        throw new Error(
          `Source Background key is invalid: ${source.backgroundImageKey}`,
        );
      }
    });
  });

  json.sources.flatMap((source) =>
    source.chapters.flatMap((chapter) =>
      chapter.maps.forEach((map) => {
        const testName = `${source.name} > ${chapter.name} > ${map.name}: imageKey should be a valid S3 key`;

        test(testName, async () => {
          try {
            expect(isValidS3KeyFormat(map.imageKey)).toBe(true);
          } catch (error) {
            throw new Error(
              `${map.name}: image key is invalid: ${map.imageKey}`,
            );
          }
        });

        if (map.videoKey) {
          const testName = `${source.name} > ${chapter.name} > ${map.name}: videoKey should be a valid S3 key`;

          test(testName, async () => {
            try {
              expect(isValidS3KeyFormat(map.videoKey!)).toBe(true);
            } catch (error) {
              throw new Error(
                `${map.name}: video key is invalid: ${map.videoKey}`,
              );
            }
          });
        }
      }),
    ),
  );
});
