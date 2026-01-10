/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/catbox',
        destination: 'https://catbox.moe/user/api.php',
      },
    ];
  },
}

module.exports = nextConfig