import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The project spec lives in claude.md; the auto-generated agent rules files
  // would sit alongside it under confusingly similar names.
  agentRules: false,
  serverExternalPackages: ["mongoose", "pdfkit", "exceljs"],
  // Allows previewing the dev server from another device on the LAN; without
  // this Next blocks the client bundle for non-localhost origins.
  allowedDevOrigins: ["192.168.66.66"],
  experimental: {
    // Only the icons actually imported are bundled.
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
};

export default nextConfig;
