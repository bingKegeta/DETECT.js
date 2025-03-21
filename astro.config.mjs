// @ts-check
import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";
import svelte from "@astrojs/svelte";
import preact from "@astrojs/preact";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  vite: {
    server: {
      allowedHosts: ["boofoo.store", "www.boofoo.store", "localhost"],
    },
  },
  site: "https://boofoo.store",
  output: "static", // Explicitly setting to static mode
  integrations: [tailwind(), svelte(), preact()],
  adapter: node({ mode: "standalone" }),
});
