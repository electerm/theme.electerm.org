/**
 * API route index — mounts all API sub-routers.
 */
import { Hono } from 'hono'
import { authRouter, githubLoginCallback } from './auth.js'
import { meRouter } from './me.js'
import { themesRouter } from './themes.js'
import { metaRouter } from './meta.js'
import { adminRouter } from './admin.js'

export const api = new Hono()

// Auth routes
api.route('/auth', authRouter)

// GitHub OAuth callback
api.get('/github-login-callback', githubLoginCallback)

// User profile
api.route('/me', meRouter)

// Themes CRUD
api.route('/themes', themesRouter)

// Meta info
api.route('/meta', metaRouter)

// Admin dashboard
api.route('/admin', adminRouter)
