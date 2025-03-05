// @ts-check
import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";

import svelte from "@astrojs/svelte";

import preact from "@astrojs/preact";

import vercel from "@astrojs/vercel";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), svelte(), preact()],
  adapter: node({
    mode: "standalone",
  }),
});