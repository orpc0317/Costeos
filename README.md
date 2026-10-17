# Costeos

Aplicación Next.js (App Router) para costeo de contratos de seguridad. Stack: TypeScript, Prisma/MySQL, Auth.js, Tailwind, shadcn.

## Desarrollo

```bash
npm install
npx prisma generate
npm run dev
```

Abre **http://localhost:30001** (no el 3000). Variables: copiar `.env.local.example` a `.env` / `.env.local`.

## Tests

```bash
npm test           # Vitest (lógica)
npm run test:e2e   # Playwright (UI, puerto 30001)
npm run test:all   # ambos
```

E2E autenticado: `E2E_EMAIL` y `E2E_PASSWORD` en `.env`. Mapa para agentes: `docs/ai-index.md`.
