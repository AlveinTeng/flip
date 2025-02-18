// src/routes/WeiboRoutes.ts

import { Router } from 'express';
import { login, getAllNotes, start } from '../../../controllers/crawlers/xhs/index.js';

const router = Router();

// Test login
router.post('/login', login);

router.post('/crawl', getAllNotes);

router.post('/start', start);

// Crawler: Get all notes
// router.post('/crawler', getAllNotes);

// // Logout: Close browser
// router.post('/logout', closeBrowser);

export default router;
