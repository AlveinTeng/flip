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
    await XiaoHongshuService.loginXhs(loginType, cookieStr);
    res.json({ message: '登录成功' });
  } catch (error) {
    res.status(500).json({ error: `登录失败: ${(error as Error).message}` });
  }
}