import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/cycling",
        permanent: false,
        has: [{ type: "host", value: "runbyweather.com" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "openweathermap.org" },
      { protocol: "https", hostname: "api.mapbox.com" },
    ],
  },
};

export default nextConfig;
