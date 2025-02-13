/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-content": "var(--color-primary-content)",
        secondary: "var(--color-secondary)",
        "secondary-content": "var(--color-secondary-content)",
        accent: "var(--color-accent)",
        "accent-content": "var(--color-accent-content)",
        neutral: "var(--color-neutral)",
        "base-100": "var(--color-base-100)",
        "base-200": "var(--color-base-200)",
        "base-300": "var(--color-base-300)",
        info: "var(--color-info)",
        "info-content": "var(--color-info-content)",
        success: "var(--color-success)",
        "success-content": "var(--color-success-content)",
        warning: "var(--color-warning)",
        "warning-content": "var(--color-warning-content)",
        error: "var(--color-error)",
        "error-content": "var(--color-error-content)",
        "neutral-content": "var(--color-neutral-content)",
        "base-content": "var(--color-base-content)",
      },
    },
  },
  plugins: [
    require("@catppuccin/tailwindcss")({
      prefix: "ctp",
      // defaultFlavour: "mocha",
    }),
  ],
};
