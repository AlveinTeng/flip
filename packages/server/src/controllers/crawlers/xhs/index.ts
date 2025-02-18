import { Request, Response } from 'express';
import { xhsService } from '../../../services/crawlers/xhs/index.js';
import { logger } from '../../../utils/crawlers/logger.js';

const XiaoHongshuService = new xhsService();

export async function start(req: Request, res: Response): Promise<void> {
  const {loginType, cookieStr, task } = req.body;

  if (!loginType) {
    res.status(400).json({ error: '登录方式 (loginType) 是必填的' });
    return;
  }

  // if (!task) {
  //   res.status(400).json({ error: '任务类型 (task) 是必填的' });
  //   return;
  // }


  try {
    await XiaoHongshuService.start(loginType, cookieStr, task);
    res.json({ message: '启动成功' });
  } catch (error) {
    res.status(500).json({ error: `启动失败: ${(error as Error).message}` });
  }


}

/**
 * 手动登录
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { loginType, cookieStr } = req.body;

  if (!loginType) {
    res.status(400).json({ error: '登录方式 (loginType) 是必填的' });
    return;
  }

  try {
    await XiaoHongshuService.loginXiaoHongShu(loginType, cookieStr);
    res.json({ message: '登录成功' });
  } catch (error) {
    res.status(500).json({ error: `登录失败: ${(error as Error).message}` });
  }
}

export async function getAllNotes(req: Request, res: Response): Promise<void> {
    const { creatorId, crawlInterval, autoLogin, loginType, cookieStr, maxCount } = req.body;
    logger.info('getAllNotes for xhs');
  
    if (!creatorId) {
      res.status(400).json({ error: '用户 ID (creatorId) 是必填的' });
      return;
    }
  
    try {
      const notes = await XiaoHongshuService.getCreatorAndNotes(
        creatorId,
        maxCount,
        autoLogin,
        loginType,
        cookieStr
      );
      res.json({ data: notes });
    } catch (error) {
      res.status(500).json({ error: `获取用户帖子失败: ${(error as Error).message}` });
    }
  }