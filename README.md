# HuntBoard

HuntBoard is a small Next.js + MCP workspace for AI-powered job search and career guidance.

## Important notes

- The project does not ship mock job listings as live results.
- If no provider is configured, the MCP job tool returns an empty result set and a clear not-configured message.
- Real provider configuration should be supplied via `.env.local` or `.env.example` placeholders.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Optional job-provider configuration

Copy `.env.example` to `.env.local` and add credentials for Adzuna, Greenhouse, or Lever as needed. The server intentionally avoids fake job data and only returns real listings from configured providers.
