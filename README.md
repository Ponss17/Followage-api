# Followage API

API sencilla para consultar cuánto tiempo lleva un usuario siguiendo a un canal de Twitch (similar al comando de Nightbot).

## Vista pública

- La landing se sirve en `/` y muestra ejemplos y un formulario para probar la API.
- Los archivos estáticos (`index.html`, `styles.css`, `app.js`) están en `public/`.

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

## Variables de entorno

- `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET` son obligatorias.
- `PORT` solo para desarrollo local; en plataformas como Render se asigna automáticamente.
- `JWT_SECRET`: clave para firmar la cookie JWT de sesión.
- `OAUTH_REDIRECT_URI`: URL de callback (p. ej. `http://localhost:3000/auth/callback`). Configura la misma en Twitch Developers.
- `TWITCH_CHANNEL_LOGIN`: canal por defecto y canal servido en el endpoint estilo Garret.
- `TWITCH_CHANNEL_TOKEN`: token de usuario del canal o moderador, con scope `moderator:read:followers`.

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

  - Estilo Garret:
    - `http://localhost:3000/twitch/followage/tu_canal/usuario?format=ymdhis&ping=false`
    - `https://followage-api.onrender.com/twitch/followage/tu_canal/usuario?format=ymwdis&ping=true`

- `GET /twitch/followage/:viewer/:channel?lang=es|en`
  
  Estilo Garret:
  - `GET /twitch/followage/{StreamerUsername}/{ViewerUsername}?format={Format}&ping={true|false}&moderatorId={ModeratorId}`
    - `StreamerUsername`: login del canal
    - `ViewerUsername`: login del viewer
    - `format`: patrón de unidades `y m w d h i s` (por defecto `ymdhis`)
    - `ping`: si es `true`, antepone `@StreamerUsername @ViewerUsername` al resultado
    - `moderatorId`: opcional; el servidor usa `TWITCH_CHANNEL_TOKEN` del canal configurado.

## Autenticación

- `GET /auth/login`: redirige a Twitch para iniciar sesión.
- `GET /auth/callback`: procesa el `code`, obtiene el usuario y guarda una cookie de sesión.
- `GET /me`: devuelve `{ authenticated, user }`.
- `POST /auth/logout`: limpia la sesión.

Si estás autenticado, `GET /api/followage` usa tu `login` como `viewer` por defecto, así puedes omitir `touser`/`user`.

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

## Despliegue en Render

Incluye `render.yaml` para crear el servicio vía Blueprint.

1. Conecta el repo de GitHub en Render y usa Blueprint.
2. Render creará el servicio web con:
   - `buildCommand`: `npm install`
   - `startCommand`: `npm start`
   - `healthCheckPath`: `/health`
   - `autoDeploy`: `true`
3. Añade variables en Render:
   - `TWITCH_CLIENT_ID` (secreto)
   - `TWITCH_CLIENT_SECRET` (secreto)
   - `JWT_SECRET` (secreto)
   - `OAUTH_REDIRECT_URI` (tu dominio + `/auth/callback`)
   - Opcional: `NODE_ENV=production`
4. No definas `PORT` (Render la asigna).