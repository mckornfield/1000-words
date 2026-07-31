export interface DeferredDisposer {
  retain(): void;
  release(): void;
}

export function createDeferredDisposer(dispose: () => void): DeferredDisposer {
  let leases = 0;
  let revision = 0;
  let disposed = false;

  return {
    retain() {
      if (disposed) return;
      leases += 1;
      revision += 1;
    },
    release() {
      if (disposed || leases === 0) return;
      leases -= 1;
      const releaseRevision = ++revision;
      queueMicrotask(() => {
        if (!disposed && leases === 0 && revision === releaseRevision) {
          disposed = true;
          dispose();
        }
      });
    },
  };
}
