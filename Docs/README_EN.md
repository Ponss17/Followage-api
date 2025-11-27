# LosPerris Twitch API

Free Twitch API with useful tools for streamers and moderators.

🌐 **Website**: [www.losperris.site](https://www.losperris.site)

## 📚 Technical Documentation

- 🗺️ **[API Visual Map](./API_FLOWCHART.md)**: Complete architecture and flow diagram.
- 📖 **[Documentación en Español](../README.md)**: Spanish version of this document.

---

## 📂 Project Structure

The server has been refactored to be modular, scalable, and easy to maintain:

- **`src/server.js`**: Main entry point and Express configuration.
- **`src/routes/`**: Definition of all API endpoints.
  - `auth.js`: Authentication routes (Login, Callback, Logout).
  - `followage.js`: Followage API endpoints.
  - `clips.js`: Clips creation endpoints.
  - `general.js`: General utilities (`/health`, `/me`).
- **`src/middleware/`**: Express middlewares (e.g., `auth.js` for cookie validation).
- **`src/utils/`**: Helper functions (e.g., `auth.js` for encryption and token handling).
- **`public/`**: Static frontend organized in folders (`css/`, `js/`, `twitch/`).

---

## ✨ New Features

### Link Type Selector (UI)
You can now choose between two methods to generate your commands on the web:

1.  **Secure (Recommended)**: Generates a link with `auth=...` (an encrypted code). This protects your real access token.
2.  **Public Token**: Generates a link with `token=...` visible. Useful if the database is unavailable, but less secure.
    *   *Note:* The server supports **automatic refresh** of public tokens if they match a previous database record.

---

## 🔍 Tool 1: Followage

Check how long a user has been following a channel.

### Chat Commands

**Nightbot:**
```
!commands add !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(user)?format=ymdhis&lang=en&auth=(your_secure_code))
```

**StreamElements:**
```
!command add !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/${user}?format=ymdhis&lang=en&auth=(your_secure_code))
```

**Streamlabs:**
```
!addcom !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(user)?format=ymdhis&lang=en&auth=(your_secure_code))
```

### Optional Parameters
- `&lang=es`: Change response language to Spanish.
- `&ping=false`: Avoid mentioning the user in the response.
- `&format=json`: Return the response in raw JSON format.

---

## 🎬 Tool 2: Clips

Create Twitch clips instantly using a chat command.

### Setup

1.  Go to [www.losperris.site/twitch/clips/](https://www.losperris.site/twitch/clips/)
2.  Click **"Sign in for Clips"**.
3.  Copy your **Secure Auth Code**.

### Chat Commands

**Nightbot:**
```
!commands add !clip $(urlfetch https://www.losperris.site/api/clips/create?auth=(your_secure_code)&channel=$(channel)&creator=$(user))
```

**StreamElements:**
```
!command add !clip $(urlfetch https://www.losperris.site/api/clips/create?auth=(your_secure_code)&channel=$(channel)&creator=${user})
```

**Streamlabs:**
```
!addcom !clip $(urlfetch https://www.losperris.site/api/clips/create?auth=(your_secure_code)&channel=$mychannel&creator=$user)
```

> ⚠️ **Important**: Replace `(your_secure_code)` with the code you obtained from the website.

### Details and Limitations
- **Cooldown**: Maximum 3 clips every 5 minutes to prevent spam.
- **Status**: Only works when the channel is live.
- **Permissions**: It is recommended to restrict this command to Moderators or Subscribers.
- **Creator**: The clip will appear created by the account that logged in on the website (can be your bot account).

---

## ❓ Frequently Asked Questions

**Is it free?**
Yes, 100% free.

**Do I need to install anything on my PC?**
No, everything works in the cloud. You just need to add the commands to your bot.

**Is it safe?**
Yes. We use official Twitch authentication and encryption to protect your credentials. Never share your tokens publicly.

**Does it work on other channels?**
The clip command only works on your own channel or on channels where your user has moderator/editor permissions.

---

## 🆘 Support

If you have problems or questions:
- **Web**: [www.losperris.site](https://www.losperris.site)
- **Discord**: ponsschiquito

---

Made with ❤️ by **LosPerris - Ponsscito**
