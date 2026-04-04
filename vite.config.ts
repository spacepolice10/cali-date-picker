// https://vitejs.dev/config/
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    copyPublicDir: false,
    lib: {
      entry: {
        "cali-date-picker": resolve(__dirname, "lib/main.ts"),
        core: resolve(__dirname, "lib/core/index.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react/jsx-runtime": "jsxRuntime",
          "react-dom": "reactDom",
        },
      },
    },
  },
});
