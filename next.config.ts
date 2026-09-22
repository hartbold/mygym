import type { NextConfig } from "next";
import { execSync } from "node:child_process";

function gitBuildId(): string {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  async generateBuildId() {
    return gitBuildId();
  },
};

export default nextConfig;
