# LosPerris Twitch API

API gratuita para Twitch con dos herramientas útiles para streamers.

🌐 **Sitio web**: [www.losperris.site](https://www.losperris.site)

---

## 🔍 Followage - Consulta tiempo de seguimiento

Verifica cuánto tiempo lleva un usuario siguiendo tu canal.

### Cómo usarlo en Nightbot

Agrega este comando en tu Nightbot:

```
!commands add !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(user)?format=ymdhis&lang=es&moderatorId=(tu_id)&token=(tu_token))
```

**Para consultar a otro usuario:**
```
!commands add !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(touser)?format=ymdhis&lang=es&moderatorId=(tu_id)&token=(tu_token))
```

**En inglés:**
```
!commands add !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(user)?format=ymdhis&lang=en&moderatorId=(tu_id)&token=(tu_token))
```

### Cómo usarlo in StreamElements

```
!command add !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/${user}?format=ymdhis&lang=es&moderatorId=(tu_id)&token=(tu_token))
```

### Ejemplos Nightbot (listos para copiar)

```
$(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(user)?format=ymdhis&ping=false&lang=es&moderatorId=(tu_id)&token=(tu_token))
```

```
$(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(touser)?format=json&lang=en&ping=true&moderatorId=(tu_id)&token=(tu_token))
```

---

## 🎬 Clips - Crear clips desde el chat

Crea clips de Twitch usando un comando de chat.

### Paso 1: Obtén tus credenciales

1. Ve a [www.losperris.site/twitch/clips/](https://www.losperris.site/twitch/clips/)
2. Haz clic en **"Iniciar sesión para Clips"**
3. Autoriza la aplicación
4. Copia tu **User ID** y **Access Token**

### Paso 2: Agrega el comando en tu bot

**Nightbot:**
```
!commands add !clip $(urlfetch https://www.losperris.site/api/clips/create?user_id=(tu_user_id)&token=(tu_token)&channel=$(channel)&creator=$(user))
```

**StreamElements:**
```
!command add !clip $(urlfetch https://www.losperris.site/api/clips/create?user_id=(tu_user_id)&token=(tu_token)&channel=$(channel)&creator=${user})
```

**Streamlabs:**
```
!addcom !clip $(urlfetch https://www.losperris.site/api/clips/create?user_id=(tu_user_id)&token=(tu_token)&channel=$mychannel&creator=$user)
```

> ⚠️ **Importante**: Reemplaza `(tu_user_id)` y `(tu_token)` con los valores que copiaste en el Paso 1.

### Respuesta en el chat

Cuando alguien use el comando `!clip`, el bot responderá:

```
✅ Clip creado por NombreUsuario: https://clips.twitch.tv/...
```

### Limitaciones

- ⏱️ Máximo 3 clips cada 5 minutos
- 📡 Solo funciona cuando el canal está en vivo
- 🔒 Recomendado: Restringir el comando solo a subs/mods
- ⏰ Cooldown sugerido: 5-10 segundos

---

## ❓ Preguntas frecuentes

**¿Es gratis?**  
Sí, completamente gratis.

**¿Necesito instalar algo?**  
No, solo agrega los comandos a tu bot de chat.

**¿Quién aparece como creador del clip?**  
El clip aparecerá creado por la cuenta que usaste para iniciar sesión en el Paso 1.

**¿Puedo usar una cuenta de bot?**  
Sí! Puedes iniciar sesión con una cuenta de bot para que los clips aparezcan creados por el bot.

**¿Es seguro compartir mi token?**  
No compartas tu token públicamente. Solo úsalo en comandos privados de tu bot.

**¿Funciona en otros canales?**  
El comando de clips solo funciona en tu canal o en canales donde seas moderador.

---

## 🆘 Soporte

Si tienes problemas o preguntas:
- Visita: [www.losperris.site](https://www.losperris.site)
- Discord: ponsschiquito

---

Hecho con ❤️ por **LosPerris - Ponsscito**