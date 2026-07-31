import { describe, expect, it, vi } from "vitest";
import { createDeferredDisposer } from "./deferredDisposer";

describe("deferred disposer", () => {
  it("survives a StrictMode setup-cleanup-setup cycle and disposes on the real unmount", async () => {
    const dispose = vi.fn();
    const lifecycle = createDeferredDisposer(dispose);

    lifecycle.retain();
    lifecycle.release();
    lifecycle.retain();
    await Promise.resolve();
    expect(dispose).not.toHaveBeenCalled();

    lifecycle.release();
    await Promise.resolve();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
