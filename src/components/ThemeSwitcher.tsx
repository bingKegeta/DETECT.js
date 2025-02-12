import { useState, useEffect } from "react";

const ThemeSwitcher = () => {
  // Add more themes here
  const themes = ["cyberpunk", "Yin and Yang", "Yang and Yin", "pastel"];
  const [theme, setTheme] = useState<string>("Yang and Yin");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(event.target.value);
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
