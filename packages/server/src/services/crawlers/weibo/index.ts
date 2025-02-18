import { Browser, BrowserContext, Page, chromium } from 'playwright';
// import NodeCache from 'node-cache';
import { logger } from '../../../utils/crawlers/logger.js';
import { WeiboLogin } from '../../../crawlers/mediaPlatforms/weibo/login.js';
import { WeiboClient } from '../../../crawlers/mediaPlatforms/weibo/client.js';

export class WeiboService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private client: WeiboClient | null = null;
  private lfidContainerId: any | null = null; 

  private async initializeClient(): Promise<void> {
    if (this.client) return; // If already initialized, skip

    try {
        this.browser = await chromium.launch({ headless: false });
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();

        const cookies = await this.context.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        this.client = new WeiboClient({
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Cookie': cookieString,
                'Content-Type': 'application/json',
            },
            playwrightPage: this.page,
            cookieDict: Object.fromEntries(cookies.map(c => [c.name, c.value])),
        });

        console.log('[WeiboService] Client initialized successfully.');
    } catch (error) {
        const errorMessage = (error as Error).message;
        console.error(`[WeiboService] Failed to initialize client: ${errorMessage}`);
        throw error;
    }
}

  public async loginWeibo(
    loginType: 'qrcode' | 'phone' | 'cookie',
    cookieStr: string = ''
  ): Promise<void> {
    logger.info('[WeiboService]: loginWeibo called');
    try {
      if (this.browser) {
        await this.close();
      }

      this.browser = await chromium.launch({ headless: true });
      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();

      const weiboLogin = new WeiboLogin(loginType, this.context, this.page, '', cookieStr);
      await weiboLogin.begin();

      const cookies = await this.context.cookies();
      const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

      logger.info(`[WeiboService] 登录成功，Cookie = ${cookieString}`);

      this.client = new WeiboClient({
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Cookie': cookieString,
          'Content-Type': 'application/json',
        },
        playwrightPage: this.page,
        cookieDict: Object.fromEntries(cookies.map(c => [c.name, c.value])),
      });
    } catch (error) {
      logger.error(`[WeiboService] 登录失败: ${(error as Error).message}`);
      throw error;
    }
  }

  private async ensureLoggedIn(
    autoLogin: boolean,
    loginType?: 'qrcode' | 'phone' | 'cookie',
    cookieStr?: string
  ): Promise<void> {
    if (!this.client) {
      if (autoLogin && loginType) {
        logger.info('[WeiboService] 未登录，自动执行登录流程...');
        await this.loginWeibo(loginType, cookieStr);
      } else {
        throw new Error('WeiboClient 未初始化，请先手动登录或在调用方法时设置autoLogin=true并传loginType');
      }
    } else {

      const isLogged = await this.client.pong();
      if (!isLogged && autoLogin && loginType) {
        logger.info('[WeiboService] Cookie 失效，自动再次登录...');
        await this.loginWeibo(loginType, cookieStr);
      } else if (!isLogged) {
        throw new Error('WeiboClient 未登录或已失效，请先调用 loginWeibo 或启用 autoLogin');
      }
    }
  }

  public async searchWeibo(
    keyword: string,
    page: number = 1,
    autoLogin = false,
    loginType?: 'qrcode' | 'phone' | 'cookie',
    cookieStr?: string
  ): Promise<any> {
    await this.ensureLoggedIn(autoLogin, loginType, cookieStr);

    if (!this.client) {
      throw new Error('WeiboClient 初始化失败');
    }
    return this.client.getNoteByKeyword(keyword, page);
  }

  public async getWeiboDetail(
    noteId: string,
    autoLogin = false,
    loginType?: 'qrcode' | 'phone' | 'cookie',
    cookieStr?: string
  ): Promise<any> {
    await this.ensureLoggedIn(autoLogin, loginType, cookieStr);

    if (!this.client) {
      throw new Error('WeiboClient 未初始化');
    }
    return this.client.getNoteInfoById(noteId);
  }

  public async getCreatorInfoByID(
    creatorId: string,
  ): Promise<any> {

    if(!this.client){
      await this.initializeClient();
    }
    

    if (!this.client) {
      throw new Error('WeiboClient 未初始化');
    }
    const creatorInfo = await this.client.getCreatorInfoById(creatorId);

    if (!creatorInfo) {
      throw new Error('Failed to get creatorInfo');
    }

    this.lfidContainerId = creatorInfo.lfid_container_id;

    return creatorInfo;
  }

  public async getAllNotesByCreatorId(
      creatorId: string,
      crawlInterval: number = 1.0,
      callback?: (notes: any[]) => Promise<void>,
      maxCount: number | null = null
  ): Promise<any[]> {
    if (!this.client) {
      logger.info('[WeiboService]: Init Client when crawl notes');
      await this.initializeClient();
    }
      
      if (!this.client) {
          throw new Error('WeiboClient 未初始化');
      }

      let lfidContainerId = this.lfidContainerId;
      if (!lfidContainerId) {
          logger.info('lfidContainerId is null, obtain it again');
          let creatorInfo = await this.getCreatorInfoByID(creatorId);
          lfidContainerId = creatorInfo.lfid_container_id;
      }

      const result: any[] = [];
      let notesHasMore = true;
      let sinceId = '';
      let crawlerTotalCount = 0;

      while (notesHasMore) {
          const notesRes = await this.client.getNotesByCreator(creatorId, lfidContainerId, sinceId);
          if (!notesRes) {
              logger.error(`[WeiboService] 用户 ${creatorId} 的数据可能被封禁或无法访问`);
              break;
          }

          sinceId = notesRes.cardlistInfo?.since_id || '0';

          if (!notesRes.cards) {
              logger.info(`[WeiboService] 响应中未找到 'cards'，原始响应: ${JSON.stringify(notesRes)}`);
              break;
          }

          const notes = notesRes.cards.filter((note: any) => note.card_type === 9);
          logger.info(`[WeiboService] 本轮获取到用户 ${creatorId} 的帖子数量: ${notes.length}`);

          if (callback) {
              await callback(notes);
          }

          result.push(...notes);
          crawlerTotalCount += notes.length;

          if (maxCount !== null && result.length >= maxCount) {
              logger.info(`[WeiboService] 达到最大爬取数量限制: ${maxCount}`);
              return result.slice(0, maxCount); 
          }

          await new Promise(resolve => setTimeout(resolve, crawlInterval * 1000));

          const total = notesRes.cardlistInfo?.total ?? 0;
          notesHasMore = total > crawlerTotalCount;
      }

      logger.info(`[WeiboService] 用户 ${creatorId} 的所有帖子获取完毕, 总数 = ${result.length}`);
      return result;
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      logger.info('[WeiboService] 浏览器已关闭');
      this.browser = null;
      this.context = null;
      this.page = null;
      this.client = null;
    }
  }
}
