import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';

export function readAuth(req, _res, next) {
    const cookies = [
        { name: 'auth', key: 'user' },
        { name: 'channel_auth', key: 'channel' },
        { name: 'clips_auth', key: 'clips' }
    ];

    for (const { name, key } of cookies) {
        const token = req.cookies?.[name];
        if (token) {
            try {
                req[key] = jwt.verify(token, jwtSecret);
            } catch (_) { }
        }
    }
    next();
}
