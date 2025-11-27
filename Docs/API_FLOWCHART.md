# 🗺️ Mapa Visual - LosPerris Followage API

## 🎯 Vista General del Sistema

```mermaid
mindmap
  root((Followage API))
    🔐 Autenticación
      OAuth Twitch
        User Auth
        Channel Auth
        Clips Auth
      JWT Cookies
      Encriptación AES-256
      Refresh Tokens
    📡 Endpoints
      Followage
        /api/followage
        /twitch/followage
      Clips
        /api/clips/create
      Chatters
        /twitch/chatter
      Auth Routes
        Login/Logout
        Callbacks
    💾 Almacenamiento
      MongoDB
        Tokens
        Usuarios
      In-Memory
        Cache
        Rate Limit
    🔗 Integraciones
      Twitch Helix API
      TMI API
      OAuth2
```

## 🏗️ Arquitectura del Sistema (Refactorizada)

```mermaid
graph TB
    subgraph "🌐 Cliente"
        Browser[🖥️ Navegador]
        Bot[🤖 Bot de Twitch]
        API_Client[📱 Cliente API]
    end
    
    subgraph "⚡ Express Server (Modular)"
        Entry[🚀 src/server.js]
        
        subgraph "Middleware (src/middleware)"
            AuthMiddleware[🔐 auth.js (readAuth)]
            GlobalMiddleware[🔧 Global (json, cors)]
        end
        
        subgraph "Rutas (src/routes)"
            AuthRoute[🔐 auth.js]
            FollowRoute[📈 followage.js]
            ClipsRoute[🎬 clips.js]
            GenRoute[⚙️ general.js]
        end
        
        subgraph "Utilidades (src/utils)"
            AuthUtil[🛠️ auth.js]
        end
        
        Error[❌ Error Handler]
    end
    
    subgraph "💾 Persistencia"
        MongoDB[(🗄️ MongoDB)]
        Memory[💭 In-Memory Cache]
    end
    
    subgraph "🔗 APIs Externas"
        TwitchAPI[💜 Twitch Helix]
        TwitchOAuth[🔑 Twitch OAuth]
    end
    
    Browser --> Entry
    Bot --> Entry
    API_Client --> Entry
    
    Entry --> GlobalMiddleware
    GlobalMiddleware --> AuthMiddleware
    AuthMiddleware --> AuthRoute
    AuthMiddleware --> FollowRoute
    AuthMiddleware --> ClipsRoute
    AuthMiddleware --> GenRoute
    
    AuthRoute --> AuthUtil
    FollowRoute --> AuthUtil
    ClipsRoute --> AuthUtil
    
    AuthRoute --> MongoDB
    FollowRoute --> TwitchAPI
    ClipsRoute --> TwitchAPI
    
    AuthUtil --> TwitchOAuth
    AuthUtil --> MongoDB
    
    AuthRoute --> Error
    FollowRoute --> Error
    ClipsRoute --> Error
    GenRoute --> Error
    
    style Browser fill:#4A90E2
    style Bot fill:#9B59B6
    style Entry fill:#E74C3C
    style AuthMiddleware fill:#E67E22
    style AuthRoute fill:#3498DB
    style FollowRoute fill:#1ABC9C
    style ClipsRoute fill:#9B59B6
    style GenRoute fill:#F1C40F
    style AuthUtil fill:#2ECC71
    style MongoDB fill:#27AE60
```

## 🔐 Flujo de Autenticación OAuth

```mermaid
graph LR
    subgraph "👤 Usuario"
        U1[Inicia Login]
        U2[Autoriza App]
        U3[✅ Autenticado]
    end
    
    subgraph "🖥️ Server (src/routes/auth.js)"
        S1[Redirect a Twitch]
        S2[Recibe Callback]
        S3[Intercambia Token]
        S4[Guarda en DB]
        S5[Set Cookie JWT]
    end
    
    subgraph "💜 Twitch"
        T1[Pantalla OAuth]
        T2[Genera Code]
        T3[Valida & Token]
    end
    
    U1 --> S1
    S1 --> T1
    T1 --> U2
    U2 --> T2
    T2 --> S2
    S2 --> S3
    S3 --> T3
    T3 --> S4
    S4 --> S5
    S5 --> U3
    
    style U1 fill:#3498DB
    style U3 fill:#2ECC71
    style S1 fill:#E67E22
    style S3 fill:#E67E22
    style T1 fill:#9B59B6
```

## 🛣️ Mapa de Rutas

```mermaid
graph TB
    ROOT[🏠 Server Entry]
    
    subgraph "🔐 src/routes/auth.js"
        AUTH_LOGIN["🚪 /auth/login"]
        AUTH_CHANNEL["📺 /auth/channel/login"]
        AUTH_CLIPS["🎬 /auth/clips/login"]
        AUTH_CB["↩️ /auth/callback"]
        AUTH_LOGOUT["🚪 /auth/logout"]
    end
    
    subgraph "⚙️ src/routes/general.js"
        ME["👤 /me"]
        CHANNEL_ME["📺 /channel/me"]
        CLIPS_ME["🎬 /clips/me"]
        HEALTH["💚 /health"]
        CHATTER["🎲 /twitch/chatter/:s"]
    end
    
    subgraph "📈 src/routes/followage.js"
        FOLLOWAGE1["📈 /api/followage"]
        FOLLOWAGE2["📈 /twitch/followage/:s/:v"]
    end
    
    subgraph "🎬 src/routes/clips.js"
        CLIPS["🎬 /api/clips/create"]
    end
    
    ROOT --> AUTH_LOGIN
    ROOT --> AUTH_CHANNEL
    ROOT --> AUTH_CLIPS
    ROOT --> AUTH_CB
    ROOT --> AUTH_LOGOUT
    
    ROOT --> ME
    ROOT --> CHANNEL_ME
    ROOT --> CLIPS_ME
    ROOT --> HEALTH
    ROOT --> CHATTER
    
    ROOT --> FOLLOWAGE1
    ROOT --> FOLLOWAGE2
    
    ROOT --> CLIPS
    
    style ROOT fill:#E74C3C,color:#fff
    style AUTH_LOGIN fill:#3498DB
    style ME fill:#3498DB
    style FOLLOWAGE1 fill:#1ABC9C
    style CLIPS fill:#9B59B6
```

## 📈 Flujo: Consultar Followage

```mermaid
graph TB
    START([🎬 Inicio]) --> METHOD{Método}
    
    METHOD -->|Cookie| COOKIE_PATH[🍪 /api/followage]
    METHOD -->|Token/DB| TOKEN_PATH[🔑 /twitch/followage]
    
    COOKIE_PATH --> CHECK_AUTH{¿Autenticado?}
    CHECK_AUTH -->|❌ No| ERROR_401[❌ 401 Unauthorized]
    CHECK_AUTH -->|✅ Sí| GET_USERS1[📡 Obtener Usuarios]
    
    TOKEN_PATH --> CHECK_TOKEN{¿Tiene Token?}
    CHECK_TOKEN -->|❌ No| CHECK_DB[🗄️ Buscar en DB]
    CHECK_TOKEN -->|✅ Sí| GET_USERS2[📡 Obtener Usuarios]
    CHECK_DB -->|❌ No| ERROR_401
    CHECK_DB -->|✅ Sí| REFRESH_LOGIC[🔄 Auto-Refresh si expirado]
    REFRESH_LOGIC --> GET_USERS2
    
    GET_USERS1 --> CALL_API[💜 Twitch API]
    GET_USERS2 --> CALL_API
    
    CALL_API --> CHECK_FOLLOW{¿Sigue?}
    
    CHECK_FOLLOW -->|❌ No| RESPONSE_NO[📤 not following]
    CHECK_FOLLOW -->|✅ Sí| CALC_TIME[⏱️ Calcular Duración]
    
    CALC_TIME --> FORMAT{Formato}
    FORMAT -->|JSON| JSON_RESP[📋 JSON Response]
    FORMAT -->|Text| TEXT_RESP[📝 Text Response]
    
    style START fill:#2ECC71
    style REFRESH_LOGIC fill:#E67E22
    style CALL_API fill:#9B59B6
    style JSON_RESP fill:#3498DB
```

## 🔒 Seguridad y Tokens (src/utils/auth.js)

```mermaid
graph TB
    subgraph "🔐 Gestión de Tokens"
        JWT[🎫 JWT Tokens]
        ENCRYPT[🔒 Encriptación]
        REFRESH[🔄 Refresh Logic]
        
        JWT --> JWT1[Cookie: auth]
        JWT --> JWT2[Cookie: channel_auth]
        JWT --> JWT3[Cookie: clips_auth]
        
        ENCRYPT --> ENC1[Algoritmo: AES-256-CTR]
        ENCRYPT --> ENC2[Key: JWT_SECRET]
        ENCRYPT --> ENC4[Uso: auth_code]
        
        REFRESH --> REF1[Detectar 401]
        REFRESH --> REF2[POST /oauth2/token]
        REFRESH --> REF3[Actualizar DB]
        REFRESH --> REF4[Reintentar Request]
    end
    
    style JWT fill:#3498DB
    style ENCRYPT fill:#E74C3C
    style REFRESH fill:#2ECC71
```

## 📊 Resumen de Endpoints

| Endpoint | Método | Archivo | Función |
|----------|--------|---------|---------|
| 🏠 `/` | GET | `server.js` | Página principal |
| 💚 `/health` | GET | `general.js` | Health check |
| 🚪 `/auth/login` | GET | `auth.js` | Login usuario |
| 📺 `/auth/channel/login` | GET | `auth.js` | Login canal |
| 🎬 `/auth/clips/login` | GET | `auth.js` | Login clips |
| ↩️ `/auth/callback` | GET | `auth.js` | Callback OAuth |
| 🚪 `/auth/logout` | POST | `auth.js` | Logout |
| 👤 `/me` | GET | `general.js` | Info usuario |
| 📺 `/channel/me` | GET | `general.js` | Info canal |
| 🎬 `/clips/me` | GET | `general.js` | Info clips |
| 📈 `/api/followage` | GET | `followage.js` | Followage (cookie) |
| 📈 `/twitch/followage/:s/:v` | GET | `followage.js` | Followage (token) |
| 🎬 `/api/clips/create` | POST/GET | `clips.js` | Crear clip |
| 🎲 `/twitch/chatter/:s` | GET | `general.js` | Chatter random |
| ❌ `/error` | GET | `server.js` | Página error |
