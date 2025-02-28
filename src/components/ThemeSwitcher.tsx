import { useState, useEffect } from "preact/hooks";
import { h } from "preact";
import ChangeEvent from "preact/compat";

const ThemeSwitcher = () => {
  // Add more themes here
  const themes = ["Cyberpunk", "Yin and Yang", "Yang and Yin", "Pastel"];
  const [theme, setTheme] = useState<string>("Cyberpunk");

  const handleThemeChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    setTheme(target.value);
    // Trigger the custom event to update the theme
    document.dispatchEvent(
      new CustomEvent("set-theme", { detail: target.value })
    );
  };

  return (
    <div className="text-neutral-content">
      <select
        id="theme-select"
        value={theme}
        onChange={handleThemeChange}
        className="p-[5px] cursor-pointer rounded-lg bg-neutral"
      >
        {themes.map((themeOption) => (
          <option key={themeOption} value={themeOption}>
            {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ThemeSwitcher;
