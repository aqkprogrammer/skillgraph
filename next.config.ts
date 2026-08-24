import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Neo4j driver is a Node-only package (it opens raw TCP/TLS sockets for Bolt).
  // Keeping it external stops Next from trying to bundle it into the server output.
  serverExternalPackages: ["neo4j-driver"],
};

export default nextConfig;
