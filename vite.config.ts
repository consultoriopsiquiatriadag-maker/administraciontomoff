import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ command }) => ({
  base: "./",
  plugins: [
    react(),
    ...(command === "build"
      ? [
          {
            name: "local-only-policy",
            transformIndexHtml: () => [
              {
                tag: "meta",
                attrs: {
                  "http-equiv": "Content-Security-Policy",
                  content:
                    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src blob:; worker-src 'self'",
                },
                injectTo: "head" as const,
              },
            ],
          },
        ]
      : []),
  ],
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
}));
