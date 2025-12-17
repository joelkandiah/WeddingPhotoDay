import fs from "fs";
import { importSPKI, exportJWK } from "jose";

const publicKeyPem = fs.readFileSync("jwt_public.pem", "utf-8");
const publicKey = await importSPKI(publicKeyPem, "RS256");

const jwk = await exportJWK(publicKey);
console.log(JSON.stringify({ keys: [jwk] }, null, 2));
