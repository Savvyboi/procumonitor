import { writeFile, rename, rm } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
export async function saveSnapshot(
  file,
  snapshot,
  { replace = rename, wait = delay } = {},
) {
  const temporary = file + ".tmp";
  try {
    await writeFile(temporary, JSON.stringify(snapshot));
    for (let attempt = 0; ; attempt++) {
      try {
        await replace(temporary, file);
        break;
      } catch (e) {
        if (
          attempt >= 7 ||
          !["EPERM", "EBUSY", "EACCES", "UNKNOWN"].includes(e.code)
        )
          throw e;
        await wait(Math.min(100 * 2 ** attempt, 2000));
      }
    }
  } finally {
    await rm(temporary, { force: true });
  }
}
