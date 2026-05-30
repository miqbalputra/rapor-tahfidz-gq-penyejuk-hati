import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pastikan template DOCX rapor ikut ter-bundle ke runtime serverless di Vercel.
  // Ada 2 lokasi yang di-trace untuk redundancy:
  //   1. src/lib/reports/templates/ — co-located dengan kode engine (paling reliable saat di-bundle)
  //   2. public/templates/          — backup, juga otomatis di-serve sebagai static asset oleh Vercel
  outputFileTracingIncludes: {
    "/api/reports/docx": [
      "./src/lib/reports/templates/**/*",
      "./public/templates/**/*",
    ],
    "/api/reports/docx-bulk": [
      "./src/lib/reports/templates/**/*",
      "./public/templates/**/*",
    ],
  },
};

export default nextConfig;
