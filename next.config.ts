import type { NextConfig } from "next";

const isGhPages = process.env.GITHUB_PAGES === "true";

// GitHub Actions 會提供 owner/repo
const githubRepository = process.env.GITHUB_REPOSITORY || "";
const repoName = githubRepository ? githubRepository.split("/")[1] : "Sepsis_prediction_smartonfhir";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },

  ...(isGhPages
    ? {
        basePath: `/${repoName}`,
        assetPrefix: `/${repoName}/`,
        trailingSlash: true, // GH Pages 建議 true，刷新比較不會 404
      }
    : {
        trailingSlash: false,
      }),
};

export default nextConfig;
