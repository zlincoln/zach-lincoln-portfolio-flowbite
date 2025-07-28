// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import flowbiteReact from "flowbite-react/plugin/astro";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), flowbiteReact()],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
});