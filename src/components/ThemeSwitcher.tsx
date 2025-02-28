import { useState, useEffect } from "preact/hooks";
import { h } from "preact";

const ThemeSwitcher = () => {
  // Add more themes here
  const themes = [
    "Cyberpunk",
    "Yin and Yang",
    "Yang and Yin",
    "Pastel",
    "Hacker",
  ];

  // Get the current theme
  const currentTheme =
    document.documentElement.attributes.getNamedItem("data-theme")?.value;
  const [theme, setTheme] = useState<string>(currentTheme || "Cyberpunk");
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleThemeChange = (selectedTheme: string) => {
    setTheme(selectedTheme);
    setIsOpen(false);
    // Trigger the custom event to update the theme
    document.dispatchEvent(
      new CustomEvent("set-theme", { detail: selectedTheme })
    );
  };

  // Theme color indicators
  const themeColors: Record<string, { primary: string; secondary: string }> = {
    Cyberpunk: { primary: "#00ffff", secondary: "#8a2be2" },
    "Yin and Yang": { primary: "#ffffff", secondary: "#000000" },
    "Yang and Yin": { primary: "#000000", secondary: "#ffffff" },
    Pastel: { primary: "#a0d2eb", secondary: "#e5eaf5" },
    Hacker: { primary: "#00ff00", secondary: "#121212" },
  };

  return (
    <div className="relative">
      {/* Current theme display button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-40 px-3 py-2 rounded-lg bg-base-300 border-2 border-primary text-base-content hover:shadow-md transition-all duration-200"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: themeColors[theme]?.primary || "#ffffff" }}
          />
          <span className="text-sm font-medium">{theme}</span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <ul
          className="absolute z-10 w-40 mt-1 py-1 bg-base-200 border-2 border-secondary rounded-lg shadow-xl"
          role="listbox"
        >
          {themes.map((themeOption) => (
            <li
              key={themeOption}
              onClick={() => handleThemeChange(themeOption)}
              className={`
                flex items-center gap-2 px-3 py-2 cursor-pointer text-sm
                ${theme === themeOption ? "bg-base-300 text-accent" : "hover:bg-base-300/50 text-base-content"}
                transition-colors duration-150
              `}
              role="option"
              aria-selected={theme === themeOption}
            >
              <span
                className={`
                  inline-block w-3 h-3 rounded-full
                  ${theme === themeOption ? "ring-2 ring-accent" : ""}
                `}
                style={{
                  background: themeColors[themeOption]?.primary || "#ffffff",
                }}
              />
              {themeOption}
              {theme === themeOption && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-accent ml-auto"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ThemeSwitcher;
