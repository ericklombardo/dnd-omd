import jwt from "jsonwebtoken";
import * as core from "@actions/core";

const secretKey = process.env.JWT_SECRET_KEY ?? "";

const generateAndSignJWT = (secretKey: string) => {
  if (!secretKey) {
    throw new Error("JWT secret key not provided");
  }

  const now = Math.floor(Date.now() / 1000);
  const fiveMinutesFromNow = now + 5 * 60; // JWT will expire in 5 minutes

  const payload = {
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier":
      "10",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name":
      "githubaction",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress":
      "githubaction@dndbeyond.com",
    displayName: "GithubAction",
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": [
      "DDB - Lorekeepers",
    ],
    nbf: now,
    exp: fiveMinutesFromNow,
    iss: "dndbeyond.com",
    aud: "dndbeyond.com",
  };

  const token = jwt.sign(payload, secretKey, { algorithm: "HS256" });
  core.setOutput("signed_jwt", token);
};

generateAndSignJWT(secretKey);
