import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html"),
          admin: path.resolve(__dirname, "admin.html"),
          profile: path.resolve(__dirname, "profile.html"),
          visa: path.resolve(__dirname, "visa.html"),
          verify: path.resolve(__dirname, "verify.html"),
          processing: path.resolve(__dirname, "processing.html"),
          bankStatement: path.resolve(__dirname, "bank-statement.html"),
          jobOfferFingerprint: path.resolve(
            __dirname,
            "job-offer-fingerprint.html",
          ),
        },
      },
    },
    server: {
      port: 3000,
      host: "0.0.0.0",
      hmr: process.env.DISABLE_HMR !== "true",
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
  };
});
