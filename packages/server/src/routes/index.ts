import express from 'express';
import appRouter from './app/index.js';
import weiboRouter from './crawlers/weibo/index.js';
import xhsRouter from './crawlers/xhs/index.js';

const router = express.Router();

router.use('/app', appRouter);


router.use('/weibo', weiboRouter);

router.use('/xhs', xhsRouter);

export default router;
