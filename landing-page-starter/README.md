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

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://qcvsioaokjjqjhxxxvbm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdnNpb2Fva2pqcWpoeHh4dmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNTA3ODIsImV4cCI6MjA4MjYyNjc4Mn0.yMn5ufxtg0stbfhtoKg7AOI5bHcEXpU7Eh4jrGQHS9M
```

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
