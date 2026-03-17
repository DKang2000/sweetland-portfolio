import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return undefined;

          if (id.includes("node_modules/@dimforge/rapier3d-compat")) {
            return "vendor-rapier";
          }

          if (id.includes("node_modules/three/examples")) {
            return "vendor-three-extras";
          }

          if (id.includes("node_modules/three")) {
            return "vendor-three-core";
          }

          if (id.includes("node_modules/gsap")) {
            return "vendor-gsap";
          }

          if (id.includes("/src/ui/WebGLFallback.ts")) {
            return "boot-fallback";
          }

          if (id.includes("/src/app/") || id.includes("/src/world/") || id.includes("/src/player/") || id.includes("/src/physics/")) {
            return "game-runtime";
          }

          if (id.includes("/src/audio/") || id.includes("/src/ui/")) {
            return "game-ui";
          }

          return undefined;
        }
      }
    }
  }
});
