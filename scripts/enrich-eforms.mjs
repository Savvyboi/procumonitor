import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { jsonRequest } from "./lib/http.mjs";
import { saveSnapshot } from "./lib/snapshot.mjs";
import {
  contentRequest,
  contentBatchRequest,
  matchContentBatch,
  enrichContent,
  enrichmentQueue,
  enrichmentCoverage,
} from "./lib/full-content.mjs";
const file = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/data/notices.json",
);
const key = process.env.HILMA_API_KEY;
if (!key) throw Error("HILMA_API_KEY is required.");
const snapshot = JSON.parse(await readFile(file, "utf8"));
const all =
  process.argv.includes("--all") || process.env.HILMA_ENRICH_ALL === "1";
const limit = Number(process.env.EFORMS_LIMIT || 200);
const concurrency = Number(process.env.HILMA_ENRICH_CONCURRENCY || 2);
if (!Number.isInteger(limit) || limit < 1 || limit > 2000)
  throw Error("EFORMS_LIMIT must be between 1 and 2000.");
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
  throw Error("HILMA_ENRICH_CONCURRENCY must be between 1 and 4.");
const pending = enrichmentQueue(snapshot.notices, all ? Infinity : limit);
const positions = new Map(snapshot.notices.map((n, i) => [n.id, i]));
const options = {
  headers: { "Ocp-Apim-Subscription-Key": key },
  redirect: "error",
};
let done = 0,
  unavailable = 0;
async function checkpoint() {
  snapshot.contentEnrichedAt = new Date().toISOString();
  snapshot.enrichment = {
    ...enrichmentCoverage(snapshot.notices),
    checkedAt: snapshot.contentEnrichedAt,
  };
  await saveSnapshot(file, snapshot);
  console.log(
    "Saved " +
      done +
      " enriched, " +
      unavailable +
      " unavailable this run. Coverage: " +
      snapshot.enrichment.enriched +
      "/" +
      snapshot.notices.length +
      "; pending " +
      snapshot.enrichment.pending +
      ".",
  );
}
function save(n, response) {
  snapshot.notices[positions.get(n.id)] = enrichContent(n, response);
  done++;
}
async function single(n) {
  try {
    save(n, await jsonRequest(contentRequest(n), options));
  } catch (e) {
    if (e.message.includes("HTTP 404")) {
      snapshot.notices[positions.get(n.id)] = {
        ...n,
        contentUnavailable: true,
        contentCheckedAt: new Date().toISOString(),
      };
      unavailable++;
    } else
      throw new Error("Hilma enrichment failed for " + n.id + ": " + e.message);
  }
  await delay(350);
}
console.log(
  "Enriching " +
    pending.length +
    " Hilma records; bulk reads and atomic checkpoints of at most 50 records.",
);
for (let offset = 0; offset < pending.length; offset += 50) {
  const batch = pending.slice(offset, offset + 50);
  let failure;
  try {
    for (const prefix of ["EF-", "PLAN-"]) {
      const group = batch.filter((n) => n.id.startsWith(prefix));
      if (!group.length) continue;
      const matched = matchContentBatch(
        group,
        await jsonRequest(contentBatchRequest(group), options),
      );
      for (const n of group) {
        const response = matched.get(Number(n.id.split("-")[1]));
        if (response) save(n, response);
        else await single(n);
      }
      await delay(350);
    }
    const legacy = batch.filter((n) => n.id.startsWith("OLD-"));
    let cursor = 0;
    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        while (cursor < legacy.length && !failure) {
          const n = legacy[cursor++];
          try {
            await single(n);
          } catch (e) {
            failure = e;
          }
        }
      }),
    );
  } catch (e) {
    failure = e;
  }
  await checkpoint();
  if (failure) throw failure;
}
if (!pending.length) await checkpoint();
console.log(
  "Finished. Only selected public procurement fields were saved; no raw XML or personal contacts.",
);
