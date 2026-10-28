// Shared asset identity and request ownership; no audio processing.
export const DEFAULT_SOURCE_NAME = "Bach Prelude No. 1 - Mallet.mp3";
export const DEFAULT_SOURCE_URL = new URL("../assets/audio/bach-prelude-72bpm.mp3", import.meta.url);

export function createSourceLoadGate() {
  let generation = 0;
  let controller = null;
  return {
    begin() {
      controller?.abort();
      controller = new AbortController();
      const id = ++generation;
      return { signal: controller.signal, current: () => id === generation };
    },
    cancel() { generation += 1; controller?.abort(); controller = null; }
  };
}

export async function fetchDefaultSource(signal) {
  // Bound a stalled initial request while keeping Open Audio available.
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 15000);
  try {
    const response = await fetch(DEFAULT_SOURCE_URL, { signal: controller.signal });
    if (!response.ok) throw new Error("Default sample is unavailable. Open an audio file to begin.");
    const bytes = await response.arrayBuffer();
    if (controller.signal.aborted) throw new DOMException("Default sample cancelled", "AbortError");
    return new File([bytes], DEFAULT_SOURCE_NAME, { type: "audio/mpeg" });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
