# PilotPay — Avatar Assets

## Estructura de directorios

```
assets/avatars/
├── avatars.json          ← catálogo maestro (id, role, gender, name, src, active)
├── cmd/
│   ├── male/             ← avatares Comandante masculino  (avatar_01.webp … )
│   └── female/           ← avatares Comandante femenino
├── cop/
│   ├── male/             ← avatares Copiloto masculino
│   └── female/           ← avatares Copiloto femenino
└── tcp/
    ├── male/             ← avatares TCP/SCC masculino
    └── female/           ← avatares TCP/SCC femenino
```

## Formato de imagen

- Formato: **WebP** (fallback PNG aceptado)
- Tamaño: **120 × 120 px** mínimo, **240 × 240 px** recomendado
- Fondo: transparente o circular recortado
- Nombre: `avatar_NN.webp` donde NN es el número de orden con cero inicial

## Flujo de carga

1. `AvatarManager.init()` intenta cargar `avatars.json` vía fetch
2. Si falla, usa el array `AVATARS[]` embebido en `index.html` como fallback
3. La selección del usuario se persiste en `profileData.avatar` (Firebase) y localStorage

## Añadir nuevos avatares

1. Colocar el archivo `.webp` en la carpeta correcta (`role/gender/`)
2. Añadir la entrada correspondiente en `avatars.json`:

```json
{
  "id": "avatar_26",
  "role": "cmd",
  "gender": "female",
  "name": "Comandante 11",
  "src": "assets/avatars/cmd/female/avatar_26.webp",
  "active": true
}
```

3. El fallback embebido en `index.html` sigue funcionando sin cambios.
