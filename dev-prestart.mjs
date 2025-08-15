import { exec as execCallback } from "child_process";
import { promisify } from "util";

const exec = promisify(execCallback);

const FETCH_TIMEOUT = 5000; // Timeout in milliseconds

const checkHealthWithTimeout = (url) => {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), FETCH_TIMEOUT),
    ),
  ]);
};

const checkLocalstackHealth = async () => {
  try {
    console.log("Checking LocalStack health...");
    const response = await checkHealthWithTimeout(
      "http://localhost:4566/_localstack/health",
    );
    return response.ok;
  } catch (error) {
    return false;
  }
};

const startLocalstack = async () => {
  console.log("Starting LocalStack...");
  await exec("docker-compose up -d localstack");
};

const runTerraform = async () => {
  console.log("Running Terraform...");
  await exec("docker-compose run --rm terraform");
};

const main = async () => {
  const isLocalstackHealthy = await checkLocalstackHealth();

  if (!isLocalstackHealthy) {
    await startLocalstack();
  } else {
    console.log("LocalStack is already running");
  }

  await runTerraform();
};

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
