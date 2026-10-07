import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (on by default in new create-next-app projects) requires
  // wrapping every dynamic read — including dynamic route params — in
  // <Suspense>. This app is almost entirely client-rendered (Firebase Auth
  // and Firestore run in the browser, there is no server session), so that
  // tradeoff buys nothing here. Left off to keep the rendering model simple.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
