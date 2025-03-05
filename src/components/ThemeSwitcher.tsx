import { useState, useEffect, useRef } from "preact/hooks";
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

  const [theme, setTheme] = useState<string>("Cyberpunk");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dropDirection, setDropDirection] = useState<"down" | "up">("down");

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  // Initialize theme from document on component mount
  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme && themes.includes(currentTheme)) {
      setTheme(currentTheme);
    }
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // Need at least 180px for dropdown (36px per item × 5 items)
      const minRequiredSpace = Math.min(180, themes.length * 36);

      // Determine if dropdown should appear above or below
      setDropDirection(
        spaceBelow >= minRequiredSpace || spaceBelow >= spaceAbove
          ? "down"
          : "up"
      );
    }
  }, [isOpen]);

  const handleThemeChange = (selectedTheme: string) => {
    setTheme(selectedTheme);
    setIsOpen(false);
    document.dispatchEvent(
      new CustomEvent("set-theme", { detail: selectedTheme })
    );
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        isOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Theme color indicators
  const themeColors: Record<
    string,
    { primary: string; secondary: string; success: string }
  > = {
    Cyberpunk: { primary: "#00ffff", secondary: "#8a2be2", success: "#39ff14" },
    "Yin and Yang": {
      primary: "#ffffff",
      secondary: "#000000",
      success: "#32cd32",
    },
    "Yang and Yin": {
      primary: "#000000",
      secondary: "#ffffff",
      success: "#32cd32",
    },
    Pastel: { primary: "#e0b0ff", secondary: "#c2a3ff", success: "#a7d1ab" },
    Hacker: { primary: "#00ff00", secondary: "#d8b4fe", success: "#ffff00" },
  };

  return (
    <div className="theme-switcher relative w-36">
      {/* Current theme display button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-base-300 border-2 border-primary text-base-content hover:shadow-md hover:border-secondary transition-all duration-200"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <div className="relative w-4 h-4 rounded-full overflow-hidden flex-shrink-0">
            <span
              className="absolute inset-0"
              style={{ background: themeColors[theme]?.primary || "#ffffff" }}
            />
            <span
              className="absolute inset-0 opacity-40"
              style={{
                background: themeColors[theme]?.secondary || "#000000",
                clipPath: "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)",
              }}
            />
          </div>
          <span className="text-sm font-medium truncate">{theme}</span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${isOpen ? "transform rotate-180" : ""}`}
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
          ref={dropdownRef}
          className={`absolute z-50 w-36 py-1 bg-base-200 border-2 border-secondary rounded-lg shadow-xl max-h-[50vh] overflow-y-auto ${
            dropDirection === "up" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
          role="listbox"
          style={{
            maxWidth: "calc(100vw - 32px)", // Ensure no horizontal overflow
            right: "0", // Align to the right of the button
          }}
        >
          {themes.map((themeOption) => (
            <li
              key={themeOption}
              onClick={() => handleThemeChange(themeOption)}
              className={`
                flex items-center gap-1 px-2 py-2 cursor-pointer text-xs
                ${theme === themeOption ? "bg-base-300 text-accent" : "text-base-content"}
                hover:bg-base-300/60 
                transition-all duration-150 group
              `}
              role="option"
              aria-selected={theme === themeOption}
            >
              <div className="relative w-4 h-4 rounded-full overflow-hidden group-hover:scale-110 transition-transform flex-shrink-0">
                <span
                  className="absolute inset-0"
                  style={{
                    background: themeColors[themeOption]?.primary || "#ffffff",
                  }}
                />
                <span
                  className="absolute inset-0 opacity-40 group-hover:opacity-70 transition-opacity"
                  style={{
                    background:
                      themeColors[themeOption]?.secondary || "#000000",
                    clipPath: "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)",
                  }}
                />
                {theme === themeOption && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-2 w-2 text-base-100"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </div>
              <span className="group-hover:font-medium transition-all truncate">
                {themeOption}
              </span>
              <div
                className="ml-auto w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                style={{
                  background: themeColors[themeOption]?.success || "#000000",
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ThemeSwitcher;
