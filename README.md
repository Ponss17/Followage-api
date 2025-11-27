# LosPerris Twitch API

API gratuita para Twitch con herramientas útiles para streamers y moderadores.

🌐 **Sitio web**: [www.losperris.site](https://www.losperris.site)

## 📚 Documentación Técnica

- 🗺️ **[Mapa Visual de la API](./Docs/API_FLOWCHART.md)**: Diagrama completo de arquitectura y flujo.
- 📖 **[English Documentation](./Docs/README_EN.md)**: Versión en inglés de este documento.

---

## 📂 Estructura del Proyecto

El servidor ha sido refactorizado para ser modular, escalable y fácil de mantener:

- **`src/server.js`**: Punto de entrada principal y configuración de Express.
- **`src/routes/`**: Definición de todos los endpoints de la API.
  - `auth.js`: Rutas de autenticación (Login, Callback, Logout).
  - `followage.js`: Endpoints de la API de followage.
  - `clips.js`: Endpoints para la creación de clips.
  - `general.js`: Utilidades generales (`/health`, `/me`).
- **`src/middleware/`**: Middlewares de Express (ej. `auth.js` para validación de cookies).
- **`src/utils/`**: Funciones auxiliares (ej. `auth.js` para encriptación y manejo de tokens).
- **`public/`**: Frontend estático organizado en carpetas (`css/`, `js/`, `twitch/`).

---

## ✨ Nuevas Características

### Selector de Tipo de Enlace (UI)
Ahora puedes elegir entre dos métodos para generar tus comandos en la web:

1.  **Seguro (Recomendado)**: Genera un enlace con `auth=...` (un código encriptado). Esto protege tu token de acceso real.
2.  **Token Público**: Genera un enlace con `token=...` visible. Útil si la base de datos no está disponible, pero es menos seguro.
    *   *Nota:* El servidor soporta **refresco automático** de tokens públicos si coinciden con un registro previo en la base de datos.

---

## 🔍 Herramienta 1: Followage

Consulta cuánto tiempo lleva un usuario siguiendo un canal.

### Comandos para Chat

**Nightbot:**
```
!commands add !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(user)?format=ymdhis&lang=es&auth=(tu_codigo_seguro))
```

**StreamElements:**
```
!command add !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/${user}?format=ymdhis&lang=es&auth=(tu_codigo_seguro))
```

**Streamlabs:**
```
!addcom !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(user)?format=ymdhis&lang=es&auth=(tu_codigo_seguro))
```

### Parámetros Opcionales
- `&lang=en`: Cambia el idioma de la respuesta a inglés.
- `&ping=false`: Evita mencionar al usuario en la respuesta.
- `&format=json`: Devuelve la respuesta en formato JSON crudo.

---

## 🎬 Herramienta 2: Clips

Crea clips de Twitch instantáneamente usando un comando de chat.

### Configuración

1.  Ve a [www.losperris.site/twitch/clips/](https://www.losperris.site/twitch/clips/)
2.  Haz clic en **"Iniciar sesión para Clips"**.
3.  Copia tu **Código de Autenticación (Seguro)**.

### Comandos para Chat

**Nightbot:**
```
!commands add !clip $(urlfetch https://www.losperris.site/api/clips/create?auth=(tu_codigo_seguro)&channel=$(channel)&creator=$(user))
```

**StreamElements:**
```
!command add !clip $(urlfetch https://www.losperris.site/api/clips/create?auth=(tu_codigo_seguro)&channel=$(channel)&creator=${user})
```

**Streamlabs:**
```
!addcom !clip $(urlfetch https://www.losperris.site/api/clips/create?auth=(tu_codigo_seguro)&channel=$mychannel&creator=$user)
```

> ⚠️ **Importante**: Reemplaza `(tu_codigo_seguro)` con el código que obtuviste en la web.

### Detalles y Limitaciones
- **Cooldown**: Máximo 3 clips cada 5 minutos para evitar spam.
- **Estado**: Solo funciona cuando el canal está en vivo.
- **Permisos**: Se recomienda restringir este comando a Moderadores o Suscriptores.
- **Creador**: El clip aparecerá creado por la cuenta que inició sesión en la web (puede ser tu cuenta de bot).

---

## ❓ Preguntas Frecuentes

**¿Es gratis?**
Sí, 100% gratis.

**¿Necesito instalar algo en mi PC?**
No, todo funciona en la nube. Solo necesitas agregar los comandos a tu bot.

**¿Es seguro?**
Sí. Usamos autenticación oficial de Twitch y encriptación para proteger tus credenciales. Nunca compartas tus tokens públicamente.

**¿Funciona en otros canales?**
El comando de clips solo funciona en tu propio canal o en canales donde tu usuario tenga permisos de moderador/editor.

---

## 🆘 Soporte

Si tienes problemas o dudas:
- **Web**: [www.losperris.site](https://www.losperris.site)
- **Discord**: ponsschiquito

---

Hecho con ❤️ por **LosPerris - Ponsscito** 