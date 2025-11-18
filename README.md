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

## Endpoints

- `GET /api/followage?touser=<viewer>&channel=<channel>&format=text|json&lang=es|en`
  - Requiere sesión de usuario.
  - `touser` (alias: `user`): usuario a comprobar.
  - `channel` (alias: `to`): canal a verificar.
  - `format`: `text` (default) o `json`.
  - `lang`: `es` (default) o `en`.

  Ejemplos:

  - Texto (es):
    - `http://localhost:3000/api/followage?touser=usuario&channel=canal`
  - JSON:
    - `http://localhost:3000/api/followage?touser=usuario&channel=canal&format=json`

- `GET /twitch/followage/{Streamer}/{Viewer}?format=ymdhis|json&ping=true|false&moderatorId=ID&lang=es|en&token=OAUTH`
  - Estilo Garret; consultas públicas si hay token de canal/moderador disponible en el servidor.
  - `Streamer`: login del canal.
  - `Viewer`: login del usuario.
  - `format`: patrón `ymdhis` (por defecto) para años/meses/días/horas/minutos/segundos, o `json` para respuesta estructurada.
  - `ping`: `true|false` para incluir menciones en el texto.
  - `moderatorId`: opcional, id del moderador cuyo token usar (si existe en el servidor).
  - `lang`: `es` o `en` para localizar el texto cuando no sigue.

  Ejemplo:
  - `http://localhost:3000/twitch/followage/ponss17/testviewer?format=ymdhis&ping=false`
  - JSON:
    - `http://localhost:3000/twitch/followage/ponss17/testviewer?format=json&lang=es&token=OAUTH`

- `GET /twitch/chatter/{Streamer}?bots=true|false&count=1..10&moderatorId=ID`
  - Devuelve uno o varios chatters aleatorios desde el canal usando TMI.
  - `bots`: incluir o excluir bots conocidos (default `false`).
  - `count`: cantidad a devolver (1..10, default `1`).
  - `moderatorId`: aceptado pero no requerido para este endpoint.

  Ejemplo:
  - `http://localhost:3000/twitch/chatter/ponss17?bots=false&count=1`

## Autenticación

- `GET /auth/login`: redirige a Twitch para iniciar sesión.
- `GET /auth/callback`: procesa el `code`, obtiene el usuario y guarda una cookie de sesión.
- `GET /me`: devuelve `{ authenticated, user }`.
- `POST /auth/logout`: limpia la sesión.

- `GET /auth/channel/login`: login de canal/moderador con `moderator:read:followers`.
- `GET /auth/channel/callback`: guarda cookie y habilita el canal/moderador en el servidor.
- `GET /channel/me`: devuelve `{ authenticated, channel }`.
- `POST /auth/channel/logout`: limpia la cookie y deshabilita el token en el servidor.

Si estás autenticado, `GET /api/followage` usa tu `login` como `viewer` por defecto, así puedes omitir `touser`/`user`.

Para uso público estilo Garret, basta con que el dueño del canal o un moderador haga login de canal/moderador una vez; a partir de ahí, cualquier visitante puede consultar `GET /twitch/followage/{Streamer}/{Viewer}` sin sesión.

## Nightbot
Puedes agregar el comando en Nightbot usando el endpoint público estilo Garret y las variables integradas:

- Usuario actual del chat:

  ```
  !commands add !followage $(urlfetch https://followage-api.onrender.com/twitch/followage/$(channel)/$(user)?format=ymdhis&lang=es&token=OAUTH_DEL_MOD)
  ```

- Consultar a otro usuario con `$(touser)`:

  ```
  !commands add !followage $(urlfetch https://followage-api.onrender.com/twitch/followage/$(channel)/$(touser)?format=ymdhis&lang=es&token=OAUTH_DEL_MOD)
  ```

- Con menciones en la respuesta (añade `ping=true`):

  ```
  !commands add !followage $(urlfetch https://followage-api.onrender.com/twitch/followage/$(channel)/$(touser)?format=ymdhis&lang=es&ping=true&token=OAUTH_DEL_MOD)
  ```

- Inglés: sustituye `lang=es` por `lang=en`.

Importante:

- Si incluyes `&token=...` en la URL, el endpoint funciona sin depender de que el canal esté habilitado en memoria o por variable de entorno.
- Pasar tokens en la URL puede exponerlos a quien tenga acceso a ver los comandos. Considera usar un token dedicado/rotatorio sólo para Nightbot.

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