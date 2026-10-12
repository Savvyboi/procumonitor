import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { saveSnapshot } from "../scripts/lib/snapshot.mjs";
test("atomic checkpoints retry a Windows file lock and leave a complete valid snapshot", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hilma-checkpoint-"));
  const file = path.join(dir, "notices.json");
  try {
    await writeFile(file, JSON.stringify({ valid: "old" }));
    let calls = 0;
    await saveSnapshot(
      file,
      { valid: "new" },
      {
        wait: async () => {},
        replace: async (...args) => {
          if (++calls === 1)
            throw Object.assign(Error("locked"), { code: "EPERM" });
          await rename(...args);
        },
      },
    );
    assert.equal(calls, 2);
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), {
      valid: "new",
    });
    await assert.rejects(readFile(file + ".tmp"), { code: "ENOENT" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("a failed checkpoint preserves the previous valid snapshot instead of leaving partial JSON", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "hilma-checkpoint-"));
  const file = path.join(dir, "notices.json");
  try {
    await writeFile(file, JSON.stringify({ valid: "old" }));
    await assert.rejects(
      saveSnapshot(
        file,
        { valid: "new" },
        {
          wait: async () => {},
          replace: async () => {
            throw Object.assign(Error("disk failure"), { code: "EIO" });
          },
        },
      ),
      { code: "EIO" },
    );
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), {
      valid: "old",
    });
    await assert.rejects(readFile(file + ".tmp"), { code: "ENOENT" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
