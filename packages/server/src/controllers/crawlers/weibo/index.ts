import { Request, Response } from 'express';
import { WeiboService } from '../../../services/crawlers/weibo/index.js';

const weiboService = new WeiboService();

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
    await weiboService.loginWeibo(loginType, cookieStr);
    res.json({ message: '登录成功' });
  } catch (error) {
    res.status(500).json({ error: `登录失败: ${(error as Error).message}` });
  }
}

/**
 * 搜索微博
 */
export async function searchWeibo(req: Request, res: Response): Promise<void> {
  const { keyword, page, autoLogin, loginType, cookieStr } = req.body;

  if (!keyword) {
    res.status(400).json({ error: '搜索关键词 (keyword) 是必填的' });
    return;
  }

  try {
    const results = await weiboService.searchWeibo(keyword, page || 1, autoLogin, loginType, cookieStr);
    res.json({ data: results });
  } catch (error) {
    res.status(500).json({ error: `搜索失败: ${(error as Error).message}` });
  }
}

/**
 * 获取微博详情
 */
export async function getWeiboDetail(req: Request, res: Response): Promise<void> {
  const { noteId, autoLogin, loginType, cookieStr } = req.body;

  if (!noteId) {
    res.status(400).json({ error: '微博 ID (noteId) 是必填的' });
    return;
  }

  try {
    const detail = await weiboService.getWeiboDetail(noteId, autoLogin, loginType, cookieStr);
    res.json({ data: detail });
  } catch (error) {
    res.status(500).json({ error: `获取微博详情失败: ${(error as Error).message}` });
  }
}

/**
 * 获取用户信息
 */
export async function getCreatorInfo(req: Request, res: Response): Promise<void> {
  const { creatorId } = req.body;

  if (!creatorId) {
    res.status(400).json({ error: '用户 ID (creatorId) 是必填的' });
    return;
  }

  try {
    const creatorInfo = await weiboService.getCreatorInfoByID(creatorId);
    res.json({ creatorinfo: creatorInfo });
  } catch (error) {
    res.status(500).json({ error: `获取用户信息失败: ${(error as Error).message}` });
  }
}

/**
 * 获取用户的所有帖子
 */
export async function getAllNotes(req: Request, res: Response): Promise<void> {
  const { creatorId, crawlInterval, autoLogin, loginType, cookieStr, maxCount } = req.body;

  if (!creatorId) {
    res.status(400).json({ error: '用户 ID (creatorId) 是必填的' });
    return;
  }

  try {
    const notes = await weiboService.getAllNotesByCreatorId(
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
  // try{
  //   const creatorInfo = await weiboService.getCreatorInfoByID(creatorId);
  //   res.json({creatorinfo: creatorInfo});
  // } catch (error) {
  //   res.status(500).json({ error: `获取用户详情失败: ${(error as Error).message}` });
  // }
}


/**
 * 关闭浏览器
 */
export async function closeBrowser(req: Request, res: Response): Promise<void> {
  try {
    await weiboService.close();
    res.json({ message: '浏览器已关闭' });
  } catch (error) {
    res.status(500).json({ error: `关闭浏览器失败: ${(error as Error).message}` });
  }
}
