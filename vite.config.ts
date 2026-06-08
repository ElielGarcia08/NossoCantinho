import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Vercel serves TanStack Start through Nitro. The Lovable wrapper targets
// Cloudflare, which can build successfully on Vercel but still produce a 404.
export default defineConfig({
  plugins: [tanstackStart({ server: { entry: "server" } }), nitro(), viteReact(), tailwindcss(), tsConfigPaths()],
});
