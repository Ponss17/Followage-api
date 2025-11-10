# Followage API

API sencilla para consultar cuánto tiempo lleva un usuario siguiendo a un canal de Twitch (similar al comando de Nightbot).

## Requisitos

- Node.js 18 o superior (usa `fetch` nativo)
- Una aplicación en [Twitch Developers](https://dev.twitch.tv/console/apps) para obtener `client_id` y `client_secret`

## Configuración

1. Copia `.env.example` a `.env` y coloca tus credenciales:

   ```
   PORT=3000
   TWITCH_CLIENT_ID=tu_client_id
   TWITCH_CLIENT_SECRET=tu_client_secret
   ```

2. Instala dependencias:

   ```
   npm install
   ```

3. Arranca el servidor:

   ```
   npm start
   ```

## Endpoints

- `GET /api/followage?touser=<viewer>&channel=<channel>&format=text|json&lang=es|en`
  - `touser` (alias: `user`): usuario que potencialmente sigue
  - `channel` (alias: `to`): canal a verificar
  - `format`: `text` (default) o `json`
  - `lang`: `es` (default) o `en`

  Ejemplos:

  - Texto (es):
    - `http://localhost:3000/api/followage?touser=usuario&channel=canal`
  - JSON:
    - `http://localhost:3000/api/followage?touser=usuario&channel=canal&format=json`

- `GET /twitch/followage/:viewer/:channel?lang=es|en`

## Respuesta JSON

```json
{
  "viewer": "usuario",
  "channel": "canal",
  "following": true,
  "followed_at": "2020-01-01T12:34:56Z",
  "duration": { "years": 3, "months": 1, "days": 12, "totalDays": 1139 }
}
```

Si no sigue:

```json
{
  "viewer": "usuario",
  "channel": "canal",
  "following": false
}
```

## Notas

- El token de aplicación de Twitch se cachea en memoria y se renueva automáticamente.
- La precisión de meses/días es aproximada (30 días por mes, 365 por año) para uso rápido tipo chat/command.
- Si necesitas precisión calendario exacta, podemos ajustar el cálculo.