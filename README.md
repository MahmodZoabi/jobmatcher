# JobMatcher

AI-powered job match scoring tool. Upload your CV, paste any job listing, and get an honest match score, tailored CV, cover letter, and gap analysis.

**Live:** https://jobmatcher-black.vercel.app

## Features
- Match scoring powered by Claude Sonnet
- CV tailoring and cover letter generation with Gemini Flash
- URL scraping with Playwright microservice
- ATS-friendly CV optimization
- Rate limiting and abuse protection

## Tech Stack
- Next.js 14 / TypeScript / Tailwind CSS
- Claude Sonnet API (job scoring)
- Gemini Flash API (cover letters, CV tailoring, scraping)
- Playwright on Render (URL scraping microservice)
- Vercel (hosting)

## Run Locally
1. Clone the repo
2. Copy .env.example to .env.local and add your API keys
3. npm install
4. npm run dev

Built by [Mahmod Zoabi](https://www.linkedin.com/in/mahmod-zoabi/) — Industrial Engineering @ Tel Aviv University
