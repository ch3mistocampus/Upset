# Upset Landing Page Starter

Complete Next.js starter code for the Upset landing page.

## Quick Start

```bash
# Create new project
npx create-next-app@latest upset-landing \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd upset-landing
npm install framer-motion
```

Then copy the files from this folder into your new project.

## Environment Variables

Create `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from: https://supabase.com/dashboard/project/_/settings/api

## File Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── privacy/page.tsx
│   └── terms/page.tsx
├── components/
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── WaitlistForm.tsx
│   └── Footer.tsx
```

## Deployment

1. Push to GitHub
2. Import to Vercel: https://vercel.com/new
3. Add environment variables in Vercel dashboard
4. Configure custom domain: getupset.app
