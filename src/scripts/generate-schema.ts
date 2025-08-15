import * as fs from "fs";

import { createGenerator } from "ts-json-schema-generator";

const generator = createGenerator({
  path: "src/types.ts",
  tsconfig: "tsconfig.json",
});

const schema = generator.createSchema("OfficialMapData");

fs.writeFileSync(
  "official-map-data.schema.json",
  JSON.stringify(schema, null, 2),
);
