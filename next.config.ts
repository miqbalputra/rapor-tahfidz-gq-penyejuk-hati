import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pastikan template DOCX rapor ikut ter-bundle ke runtime serverless di Vercel.
  // Tanpa ini, fs.readFile dari API route bisa gagal karena file di luar tracing.
  outputFileTracingIncludes: {
    "/api/reports/docx": ["./src/lib/reports/templates/**/*"],
    "/api/reports/docx-bulk": ["./src/lib/reports/templates/**/*"],
  },
};

export default nextConfig;
