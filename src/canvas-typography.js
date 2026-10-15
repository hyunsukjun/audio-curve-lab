// COMMON CANDIDATE: CSS-pixel typography; independent of canvas backing resolution.
const family = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const canvasType = Object.freeze({
  tick: `400 11px ${family}`,
  majorTick: `500 11px ${family}`,
  section: `600 11px ${family}`,
  hint: `400 12px ${family}`,
  point: `500 12px ${family}`,
  channel: `600 10px ${family}`
});
