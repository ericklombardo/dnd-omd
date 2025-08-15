import fs from "node:fs";

const MAX_RETRIES = 3;
const BACKOFF_FACTOR = 2;
const INITIAL_DELAY_MS = 500;

const deployData = async (url: string, token: string, filePath: string) => {
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage = `API returned ${response.status}`;

        if (contentType && contentType.includes("application/json")) {
          const errorResponse = await response.json();
          errorMessage = errorResponse.error || errorMessage;
        } else {
          const errorText = await response.text();
          console.error("Non-JSON response body:", errorText);
          errorMessage = `Non-JSON response: ${errorText}`;
        }

        throw new Error(errorMessage);
      }

      console.log("Success: API returned 200");
      return 0;
    } catch (error) {
      console.error("Error:", error);
      const delayMs = INITIAL_DELAY_MS * Math.pow(BACKOFF_FACTOR, i);
      console.log(`Retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error("Failed to deploy data after " + MAX_RETRIES + " retries");
  return 1;
};

const url = process.env.API_URL;
const token = process.env.BEARER_TOKEN;
const filePath = process.env.JSON_FILE_PATH;
if (
  typeof url !== "string" ||
  typeof token !== "string" ||
  typeof filePath !== "string"
) {
  console.error(
    "Error: One or more environment variables are not defined or not a string",
  );
  process.exit(1);
}
process.exit(await deployData(url, token, filePath));
