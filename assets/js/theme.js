// Theme toggle: cycles system -> light -> dark and persists the choice.
// The initial theme is resolved by an inline script in head.html.
(function () {
  const order = ["system", "light", "dark"];
  const labels = {
    system: "Theme: system (click for light)",
    light: "Theme: light (click for dark)",
    dark: "Theme: dark (click for system)",
  };
  const root = document.documentElement;
  const media = matchMedia("(prefers-color-scheme: dark)");

  function apply(pref) {
    const dark = pref === "dark" || (pref === "system" && media.matches);
    root.dataset.themePref = pref;
    root.dataset.theme = dark ? "dark" : "light";
    for (const button of document.querySelectorAll(".theme-toggle")) {
      button.setAttribute("aria-label", labels[pref]);
      button.title = labels[pref];
    }
  }

  function current() {
    return order.includes(root.dataset.themePref) ? root.dataset.themePref : "system";
  }

  for (const button of document.querySelectorAll(".theme-toggle")) {
    button.addEventListener("click", function () {
      const next = order[(order.indexOf(current()) + 1) % order.length];
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
      apply(next);
    });
  }

  media.addEventListener("change", function () {
    if (current() === "system") apply("system");
  });

  // Keep tabs in sync.
  window.addEventListener("storage", function (event) {
    if (event.key === "theme") apply(event.newValue || "system");
  });

  apply(current());
})();
