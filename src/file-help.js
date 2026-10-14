const help = document.getElementById("fileHelp");
// Let the disclosure own Space; do not toggle audio behind the help panel.
for (const type of ["keydown", "keyup"]) {
  help.addEventListener(type, event => {
    if (event.code === "Space") event.stopPropagation();
    if (type === "keydown" && event.key === "Escape" && help.open) {
      event.preventDefault();
      event.stopPropagation();
      help.open = false;
      help.querySelector("summary").focus();
    }
  });
}
document.addEventListener("pointerdown", event => {
  if (help.open && !help.contains(event.target)) help.open = false;
});
