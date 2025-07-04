This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Setup TPM Agent as a GitHub app

Create a GitHub OAuth App (if you haven't already):

- Go to https://github.com/settings/developers
- Click "New OAuth App"
- Set:
  - Application name: "TPM Agent"
  - Homepage URL: http://localhost:3000
  - Authorization callback URL: http://localhost:3000/api/auth/callback/github
- Update `.env.local` with real values:
  - Replace your-github-client-id with your actual GitHub OAuth App Client ID
  - Replace your-github-client-secret with your actual GitHub OAuth App Client Secret
  - Replace your-secret-key-here with a random string (you can generate one with `openssl rand -base64 32` )

