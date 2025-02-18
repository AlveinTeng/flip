// src/routes/WeiboRoutes.ts

import { Router } from 'express';
import { login, getAllNotes, closeBrowser, getCreatorInfo } from '../../../controllers/crawlers/weibo/index.js';

const router = Router();

// Test login
router.post('/login', login);

router.post('/creator', getCreatorInfo);

// Crawler: Get all notes
router.post('/crawler', getAllNotes);

// Logout: Close browser
router.post('/logout', closeBrowser);

export default router;
