import "dotenv/config";
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import pinsRouter from './routes/pins'
import connectionsRouter from './routes/connections'
import authRouter from './routes/auth'
import safetyRouter from './routes/safety'
import uploadRouter from './routes/upload'
import { wss, handleUpgrade } from './websocket'
import { lucia } from './auth'
import { startCleanupService } from './services/cleanup'
import type { User, Session } from 'lucia'

type Variables = {
    user: User | null;
    session: Session | null;
}

const app = new Hono<{ Variables: Variables }>()


app.use('/*', cors({
    origin: (origin) => {
        if (!origin) return process.env.FRONTEND_URL || 'http://localhost:3000';

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const allowedOrigins = frontendUrl.split(',').map(url => url.trim().replace(/\/$/, ''));
        const normalizedOrigin = origin.replace(/\/$/, '');

        // Allow explicit frontend URLs or any vercel.app subdomain
        if (allowedOrigins.includes(normalizedOrigin) || normalizedOrigin.endsWith('.vercel.app')) {
            return origin;
        }

        console.log(`[CORS] Origin rejected: ${origin}`);
        return null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposeHeaders: ['Set-Cookie'],
    maxAge: 600,
}))
app.use('*', logger())
app.use('*', prettyJSON())

app.onError((err, c) => {
    console.error(`[GLOBAL ERROR] ${err.message}`);
    console.error(err.stack);
    return c.json({
        error: "Internal Server Error",
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, 500);
});

// Auth middleware - attach user to context if session exists
app.use('*', async (c, next) => {
    const sessionId = lucia.readSessionCookie(c.req.header("Cookie") ?? "");

    if (!sessionId) {
        c.set('user', null);
        c.set('session', null);
        return next();
    }

    const { session, user } = await lucia.validateSession(sessionId);

    if (session && session.fresh) {
        c.header("Set-Cookie", lucia.createSessionCookie(session.id).serialize(), { append: true });
    }
    if (!session) {
        c.header("Set-Cookie", lucia.createBlankSessionCookie().serialize(), { append: true });
    }

    c.set('user', user);
    c.set('session', session);

    return next();
});

app.route('/auth', authRouter)
app.route('/safety', safetyRouter)
app.route('/', uploadRouter)
app.route('/', pinsRouter)
app.route('/connections', connectionsRouter)

app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Start background services
startCleanupService();

const port = Number(process.env.PORT) || 3001
console.log(`Server is running on port ${port}`)

const server = serve({
    fetch: app.fetch,
    port
})

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
    if (req.url === '/ws') {
        handleUpgrade(req, socket, head);
    } else {
        socket.destroy();
    }
});

export default app

