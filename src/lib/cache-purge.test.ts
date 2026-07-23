import { describe, it, expect, vi } from "vitest";
import { purgeTags } from "./cache-purge";

describe("purgeTags", () => {
  it("does nothing and never calls purgeCache when tags is empty", async () => {
    const purgeCache = vi.fn();

    await purgeTags([], purgeCache);

    expect(purgeCache).not.toHaveBeenCalled();
  });

  it("calls purgeCache once with all given tags", async () => {
    const purgeCache = vi.fn().mockResolvedValue(undefined);

    await purgeTags(["listings", "noticia-some-slug"], purgeCache);

    expect(purgeCache).toHaveBeenCalledTimes(1);
    expect(purgeCache).toHaveBeenCalledWith({ tags: ["listings", "noticia-some-slug"] });
  });

  it("logs and does not throw when purgeCache rejects", async () => {
    const purgeCache = vi.fn().mockRejectedValue(new Error("purge API down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(purgeTags(["listings"], purgeCache)).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
