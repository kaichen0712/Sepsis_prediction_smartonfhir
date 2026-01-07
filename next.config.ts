import type { NextConfig } from "next";

const isGhPages = process.env.GITHUB_PAGES === "true";

// GitHub Actions 會提供 owner/repo（格式：owner/repo）
// 本機開發時沒有這個 env，所以用預設 repo 名
const githubRepository = process.env.GITHUB_REPOSITORY || "";
const repoName = githubRepository ? githubRepository.split("/")[1] : "Sepsis_prediction_smartonfhir";

const nextConfig: NextConfig = {
  // GH Pages 靜態部署一定要 export
  output: "export",

  // GitHub Pages 上 Next/Image 需要關閉最佳化
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: isGhPages ? `/${repoName}` : "",
  },

  // 只有 GH Pages 才需要 basePath / assetPrefix
  ...(isGhPages
    ? {
        basePath: `/${repoName}`,
        assetPrefix: `/${repoName}/`,
        // 產出 out/smart/launch/index.html，讓 /smart/launch/ 不會 404
        trailingSlash: true,
      }
    : {
        trailingSlash: false,
      }),
};

export default nextConfig;
