import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  functions: {
    "steam-login": {
      name: "Steam Login (OpenID 2.0)",
      source: "./steam-login/index.ts",
    },
  },
});
