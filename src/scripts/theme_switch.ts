// Get the current theme
const themeAttr = document.documentElement.attributes.getNamedItem("data-theme");
const themeValue = themeAttr?.value ?? "";

const currentTheme: string = ["dark", "light", "device"].includes(themeValue) 
  ? "Cyberpunk" 
  : themeValue || "Cyberpunk";

// Set the theme
document.dispatchEvent(new CustomEvent("set-theme", { detail: currentTheme }));
