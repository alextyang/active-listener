import path from "path";
import { fileURLToPath } from "url";

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
    {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "X-Frame-Options",
        value: "DENY",
    },
    {
        key: "X-Permitted-Cross-Domain-Policies",
        value: "none",
    },
    {
        key: "Permissions-Policy",
        value: "camera=(), geolocation=(), microphone=()",
    },
    {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin",
    },
    {
        key: "Cross-Origin-Resource-Policy",
        value: "same-site",
    },
    {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    outputFileTracingRoot: workspaceRoot,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'i.scdn.co'
            },
            {
                protocol: 'https',
                hostname: 'mosaic.scdn.co'
            },
            {
                protocol: 'https',
                hostname: 'profile-images.scdn.co'
            },
            {
                protocol: 'https',
                hostname: '**.spotifycdn.com'
            },
            {
                protocol: 'https',
                hostname: 's2.googleusercontent.com'
            }
        ],
    },
    async headers() {
        return [
            {
                source: "/:path*",
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;
