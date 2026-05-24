# PilotPay — Estado de ramas

**Fecha:** 2026-05-24

---

## Rama activa de producción: `avatars-redesign`

GitHub Pages sirve desde: `avatars-redesign` / `/docs`

Esta rama contiene:
- `frontend/` — fuente de desarrollo
- `docs/` — copia publicada (sincronizada via `npm run sync` + GitHub Actions)
- `backend/` — motor de cálculo
- `scripts/sync-docs.js` — script de sincronización
- `.github/workflows/sync-docs.yml` — CI auto-sync
- `package.json` — comandos de deploy

---

## Rama obsoleta: `main`

`main` fue poblada manualmente via "Add files via upload" en GitHub.com.
Historial divergente, sin `frontend/`, sin workflow.

**No usar `main` para desarrollo ni deploy.**

Limpieza pendiente (cuando sea oportuno):
- Opción limpia: `git push origin avatars-redesign:main --force`
  Reemplaza `main` con el estado actual de `avatars-redesign`.
  `origin/main` no tiene historial valioso que preservar.

---

## Flujo de publicación actual

```
Editar frontend/
    ↓
git add frontend/ && git commit && git push origin avatars-redesign
    ↓
GitHub Actions (sync-docs.yml) detecta cambios en frontend/**
    ↓
Ejecuta scripts/sync-docs.js → copia frontend/ → docs/
    ↓
Commit automático "deploy: sync docs/ [skip ci]" + push
    ↓
GitHub Pages publica docs/ actualizado
```

Alternativa local (sync explícito antes del push):
```
npm run sync
git add frontend/ docs/ && git commit && git push
```
