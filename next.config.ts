import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";
import type { NextConfig } from "next";

const isStaticPreview = process.env.STATIC_PREVIEW === "true";
const i18nRequestPath =
  path.basename(process.cwd()) === "storybook"
    ? "../i18n/request.ts"
    : "./i18n/request.ts";

const withNextIntl = createNextIntlPlugin(i18nRequestPath);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
];

const headers: NextConfig["headers"] = async () => [
  { source: "/:path*", headers: securityHeaders },
];

const nextConfig: NextConfig = isStaticPreview
  ? {
      output: "export",
      basePath: "/RESON-music",
      trailingSlash: true,
      images: { unoptimized: true },
      headers,
    }
  : {
      serverExternalPackages: ["stripe"],
      headers,
    };

export default withNextIntl(nextConfig);
