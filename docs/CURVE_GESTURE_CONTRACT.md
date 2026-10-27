# Audio curve gesture pilot

Status: Audio-only approved web gesture contract, 2026-10-27. The user confirmed actual Shift group movement and approved commit/deployment after verification. Publication evidence is recorded separately in the shared release QA folder. COMMON CANDIDATE / STANDALONE ASSET; adoption by other Labs or native implementation requires its own scope.

## Approved interaction

| Input | Meaning |
|---|---|
| Ordinary Pen click / drag | Existing empty-click addition and single-point free X/Y movement |
| Mac Option-click | Temporary single interior-point erase; replaces Mac Command-click |
| Other platforms Ctrl-click | Existing temporary erase retained |
| Shift + press an existing point, then drag | Move the clicked point and the following points in time-sorted order by one shared vertical delta; every stored X stays fixed |
| Shift-click empty space | No point added; no group created |
| Esc during the group drag | Restore that gesture's original Y values and edited flag |

The group belongs only to the active curve. Membership and interaction mode are captured at pointer-down; releasing Shift before pointer-up does not change them. Pressing Shift during an ordinary drag does not convert it into a group drag. When modifiers overlap, temporary/selected Eraser takes priority. Endpoint deletion protection is unchanged; endpoints may participate in vertical group movement.

## Data and bounds

Points stay normalized `{x,y}` with existing interpolation and per-parameter mappings. The gesture stores original Y values and applies the same delta to each member. It limits the shared delta when any member reaches 0 or 1; it does not clamp members separately and flatten the group's shape. Returning from a boundary responds to the original grab position without accumulating an offset. Clicking near a point does not jump its value to the pointer before dragging.

`X fixed` means normalized output-time X is unchanged. Changing Speed Y still changes the existing speed-to-output-duration calculation; this is not a promise of fixed absolute output seconds. Pitch cents, Pan orientation and all musical ranges keep their existing mapping. A common normalized delta preserves normalized vertical gaps, not a new musical mapping.

## Lifecycle and state

Normal pointer-up accepts the gesture. Esc, pointer cancellation, loss of capture, window blur, parameter/tool switching, Clear Current or Reset All abandon an in-progress group first. This adds gesture cancellation only, not a general curve Undo feature. Other existing action semantics remain.

A curve edit uses the existing curve-message/invalidation path. It does not seek, stop, resume, reset or reselect the source. The existing source selection, source edit position, source playhead and output playback position keep their distinct meanings. Real-time Preview consumes the changed curves through the existing engine; previously rendered output becomes stale through the existing policy. Cancel restores curve data but conservatively does not certify a previously rendered buffer as fresh.

## Feedback and portability

Use the existing active-parameter color, typography, six-pixel point drawing and ten-pixel hit tolerance. A vertical cursor and a thin group ring identify the affected suffix; the existing point tooltip adds a member count and vertical arrow. Keep the ring inside the right edge without moving any point or plot boundary. Pen/Eraser tooltips and the canvas accessible label explain the shortcut; the canvas has no additional native title popup competing with its point tooltip.

Native implementations should preserve the gesture's transaction, shared bound, active-curve scope and state distinctions; use native cursors, focus, modifier conventions and independent hit-target validation. Do not copy CSS pixels into native point specifications or infer touch support from this desktop modifier gesture.

## Evidence and limits

The initial QA report is `work/CurveLabWebV1/qa/audio-shift-group-20261027/VERIFICATION.md`; follow-up release evidence is `work/CurveLabWebV1/qa/audio-shift-release-20261027/` in the shared workspace. The user confirmed actual Shift group movement with fixed X. Actual native Option deletion, both protected endpoints and ordinary XY drag were also checked; synthetic pointer sequences, model/message comparisons and silent playback remain separately identified. DSP source files are unchanged. No new listening, Windows hardware, touch, native implementation or product-wide acceptance is inferred from these checks.
