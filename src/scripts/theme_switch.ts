// Get the current theme
const currentTheme =
  document.documentElement.attributes.getNamedItem("data-theme")?.value;
// Set the theme
document.dispatchEvent(new CustomEvent("set-theme", { detail: currentTheme }));
