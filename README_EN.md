# LosPerris Twitch API

Free Twitch API with two useful tools for streamers.

🌐 **Website**: [www.losperris.site](https://www.losperris.site)

---

## 🔍 Followage - Check Follow Time

Check how long a user has been following your channel.

### How to use it in Nightbot

Add this command to your Nightbot:

```
!commands add !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(user)?format=ymdhis&lang=en&auth=(your_secure_code))
```

**To check another user:**
```
!commands add !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(touser)?format=ymdhis&lang=en&auth=(your_secure_code))
```

**In Spanish:**
```
!commands add !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(user)?format=ymdhis&lang=es&auth=(your_secure_code))
```

### How to use it in StreamElements

```
!command add !followage $(urlfetch https://www.losperris.site/twitch/followage/$(channel)/${user}?format=ymdhis&lang=en&auth=(your_secure_code))
```

### Nightbot Examples (ready to copy)

```
$(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(user)?format=ymdhis&ping=false&lang=en&auth=(your_secure_code))
```

```
$(urlfetch https://www.losperris.site/twitch/followage/$(channel)/$(touser)?format=json&lang=es&ping=true&auth=(your_secure_code))
```

---

## 🎬 Clips - Create Clips from Chat

Create Twitch clips using a chat command.

### Step 1: Get your credentials

1. Go to [www.losperris.site/twitch/clips/](https://www.losperris.site/twitch/clips/)
2. Click **"Sign in for Clips"**
3. Authorize the application
4. Copy your **Secure Auth Code**

### Step 2: Add the command to your bot

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

> ⚠️ **Important**: Replace `(your_secure_code)` with the value you copied in Step 1.
> ℹ️ **Note**: The legacy `user_id` and `token` parameters still work, but using `auth` is recommended for better security.

### Chat response

When someone uses the `!clip` command, the bot will respond:

```
✅ Clip created by Username: https://clips.twitch.tv/...
```

### Limitations

- ⏱️ Maximum 3 clips every 5 minutes
- 📡 Only works when the channel is live
- 🔒 Recommended: Restrict command to subs/mods only
- ⏰ Suggested cooldown: 5-10 seconds

---

## ❓ Frequently Asked Questions

**Is it free?**  
Yes, completely free.

**Do I need to install anything?**  
No, just add the commands to your chat bot.

**Who appears as the clip creator?**  
The clip will appear created by the account you used to sign in during Step 1.

**Can I use a bot account?**  
Yes! You can sign in with a bot account so clips appear created by the bot.

**Is it safe to share my token?**  
Don't share your token publicly. Only use it in your bot's private commands.

**Does it work in other channels?**  
The clip command only works in your channel or in channels where you're a moderator.

---

## 🆘 Support

If you have problems or questions:
- Visit: [www.losperris.site](https://www.losperris.site)
- Discord: ponsschiquito

---

Made with ❤️ by **LosPerris - Ponsscito**
