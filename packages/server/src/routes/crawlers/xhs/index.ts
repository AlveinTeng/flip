// src/routes/WeiboRoutes.ts

import { Router } from 'express';
import { login, getAllNotes } from '../../../controllers/crawlers/xhs/index.js';

const router = Router();

// Test login
router.post('/login', login);

router.post('/crawl', getAllNotes);

// Crawler: Get all notes
// router.post('/crawler', getAllNotes);

// // Logout: Close browser
// router.post('/logout', closeBrowser);

export default router;
