import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { jsonRequest } from "./lib/http.mjs";
import { enrichFromXml } from "./lib/eforms.mjs";
const file = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/data/notices.json",
);
const key = process.env.HILMA_API_KEY;
if (!key) throw new Error("HILMA_API_KEY is required.");
const snapshot = JSON.parse(await readFile(file, "utf8"));
const limit = Number(process.env.EFORMS_LIMIT || 200);
if (!Number.isInteger(limit) || limit < 1 || limit > 2000)
  throw new Error("EFORMS_LIMIT must be between 1 and 2000.");
let done = 0,
  unavailable = 0;
for (let i = 0; i < snapshot.notices.length; i++) {
  const n = snapshot.notices[i];
  if (!n.id.startsWith("EF-") || n.fullContentAvailable || n.contentUnavailable)
    continue;
  if (done + unavailable >= limit) break;
  try {
    const result = await jsonRequest(
      "https://api.hankintailmoitukset.fi/avp-eforms/external-read/v1/notice/" +
        n.noticeId,
      { headers: { "Ocp-Apim-Subscription-Key": key } },
    );
    if (!result.eForm) throw new Error("No eForms content in response.");
    snapshot.notices[i] = enrichFromXml(n, result.eForm);
    done++;
  } catch (e) {
    if (e.message.includes("HTTP 404")) {
      snapshot.notices[i] = { ...n, contentUnavailable: true };
      unavailable++;
    } else
      throw new Error(
        "eForms enrichment failed; snapshot preserved: " + e.message,
      );
  }
  if ((done + unavailable) % 25 === 0)
    console.log("Enriched " + done + " full eForms notices.");
  await delay(350);
}
snapshot.contentEnrichedAt = new Date().toISOString();
await writeFile(file, JSON.stringify(snapshot));
console.log(
  "Saved " +
    done +
    " XML-enriched notices; " +
    unavailable +
    " unavailable. Full XML and personal contacts are not retained.",
);
