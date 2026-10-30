# Grimório

Sistema de fichas para a mesa de RPG: cada jogador edita a própria ficha, e o mestre acompanha a mesa inteira ao vivo.

Stack: Next.js 16 (App Router) + TypeScript, Tailwind CSS 4 + shadcn/ui, Supabase (Postgres, RLS, Auth, Storage, Realtime) e Vercel.

## Rodando localmente

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha com a URL e a publishable key do Supabase.
3. `npm run dev` e abra http://localhost:3000
