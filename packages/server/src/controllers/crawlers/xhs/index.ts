import { Request, Response } from 'express';
import { xhsService } from '../../../services/crawlers/xhs/index.js';

const XiaoHongshuService = new xhsService();

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
  
    if (!creatorId) {
      res.status(400).json({ error: '用户 ID (creatorId) 是必填的' });
      return;
    }
  
    try {
      const notes = await XiaoHongshuService.getAllNotesByCreatorId(
        creatorId,
        crawlInterval || 1.0,
        undefined,
        autoLogin,
        loginType,
        cookieStr,
        maxCount
      );
      res.json({ data: notes });
    } catch (error) {
      res.status(500).json({ error: `获取用户帖子失败: ${(error as Error).message}` });
    }
  }