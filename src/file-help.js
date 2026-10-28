// Shared disclosure behavior; no edit, transport or audio commands are dispatched.
for (const help of document.querySelectorAll(".fileHelp")) {
  const shortcuts = help.classList.contains("shortcutHelp");
  const close = () => { help.open = false; help.querySelector("summary").focus(); };
  // Let the disclosure own Space rather than toggling transport behind it.
  for (const type of ["keydown", "keyup"]) {
    help.addEventListener(type, event => {
      if (event.code === "Space") event.stopPropagation();
      if (type === "keydown" && event.key === "Escape" && help.open) {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    });
  }
  document.addEventListener("pointerdown", event => {
    if (help.open && !help.contains(event.target)) help.open = false;
  });
  if (!shortcuts) continue;
  help.addEventListener("toggle", () => {
    if (!help.open) return;
    const panel = help.querySelector(".fileHelpPanel");
    const anchor = help.querySelector("summary").getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    panel.style.width = `${Math.min(460, Math.max(0, viewportWidth - 24))}px`;
    const bounds = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(12, Math.min(anchor.left, viewportWidth - bounds.width - 12))}px`;
    const below = anchor.bottom + 8;
    panel.style.top = `${Math.max(12, Math.min(below, innerHeight - bounds.height - 12))}px`;
  });
  // Close the guide first; Escape must not cancel a background editing mode.
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && help.open) {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  }, true);
  help.addEventListener("focusout", event => {
    if (event.relatedTarget && !help.contains(event.relatedTarget)) help.open = false;
  });
  window.addEventListener("resize", () => { help.open = false; });
  window.addEventListener("scroll", event => {
    if (!help.contains(event.target)) help.open = false;
  }, true);
}
