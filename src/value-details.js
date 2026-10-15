// Disclosure keyboard activation must not also toggle transport.
for (const details of document.querySelectorAll(".valueDetails")) {
  for (const type of ["keydown", "keyup"]) {
    details.addEventListener(type, event => {
      if (event.target.closest("summary") && event.code === "Space") event.stopPropagation();
    });
  }
}
