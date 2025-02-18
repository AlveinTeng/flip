// 省略文件开头的 License 声明等内容
// 假设已安装 p-limit：npm install p-limit

import pLimit from 'p-limit'; // 用于并发控制
import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { logger } from '../../../utils/crawlers/logger.js';
import { xhsLogin } from '../../../crawlers/mediaPlatforms/xhs/login.js'; 
import { xhsClient } from '../../../crawlers/mediaPlatforms/xhs/client.js'; 
import { fileURLToPath } from 'url';

import { convertCookies } from '../../../utils/crawlers/crawler_util.js';
// import { log } from 'console';
import * as path from 'path';
const __filename = fileURLToPath(import.meta.url);

// Define or import IpInfoModel
interface IpInfoModel {
    ip: string;
    port: number;
    username?: string;
    password?: string;
}
const __dirname = path.dirname(__filename);

export class xhsService {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private client: xhsClient | null = null;
    private indexUrl: string = "https://www.xiaohongshu.com";
    private userAgent: string;

    constructor() {
        this.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
    }

    private async formatProxyInfo(ipProxyInfo: IpInfoModel): Promise<[string, string]> {
        // Implement proxy formatting logic here.
        return ['', '']; // return formatted proxy details.
    }

    private async launchBrowser(chromium: any, proxy: any, userAgent: string, headless: boolean) {
        const browserContext = await chromium.launchPersistentContext('', {
            headless,
            userAgent,
        });
        return browserContext;
    }

    public async createXhsClient(httpxProxy: string | null): Promise<xhsClient> {
        logger.info("[XiaoHongShuCrawler.createXhsClient] Begin create xiaohongshu API client ...");

        // Convert cookies into the required format
        const [cookieStr, cookieDict] = await convertCookies(await this.context!.cookies());

        // Create and return the XiaoHongShuClient object
        const xhsClientObj = new xhsClient({
            proxies: httpxProxy,
            headers: {
                "User-Agent": this.userAgent,
                "Cookie": cookieStr,
                "Origin": "https://www.xiaohongshu.com",
                "Referer": "https://www.xiaohongshu.com",
                "Content-Type": "application/json;charset=UTF-8",
            },
            playwrightPage: this.page!,
            cookieDict: cookieDict,
        });

        return xhsClientObj;
    }

    public async start(loginType: 'qrcode' | 'phone' | 'cookie', cookieStr: string = '', task: string): Promise<void> {
        let playwrightProxyFormat: string | null = null;
        let httpxProxyFormat: string | null = null;

        // if (config.ENABLE_IP_PROXY) {
        //     const ipProxyPool = await createIpPool(config.IP_PROXY_POOL_COUNT, true);
        //     const ipProxyInfo: IpInfoModel = await ipProxyPool.getProxy();
        //     [playwrightProxyFormat, httpxProxyFormat] = await this.formatProxyInfo(ipProxyInfo);
        // }

        const playwright = chromium;
        this.context = await this.launchBrowser(
            playwright,
            playwrightProxyFormat,
            this.userAgent,
            false
        );

        const stealthPath = path.resolve(__dirname, '../../../libs/stealth.min.js');
        // await this.context.addInitScript({ path: stealthPath });
        if (this.context) {
            await this.context.addInitScript({ path: stealthPath });
        }

        // Add cookie to avoid sliding captcha
        if (this.context) {
            await this.context.addCookies([{
                name: 'webId',
                value: 'xxx123', // any value
                domain: '.xiaohongshu.com',
                path: '/',
            }]);
        }

        if (this.context) {
            this.page = await this.context.newPage();
        } else {
            throw new Error('Browser context is not initialized');
        }
        await this.page.goto(this.indexUrl);

        this.client= await this.createXhsClient(httpxProxyFormat);

        if (!await this.client.pong()) {
            const loginObj =  new xhsLogin(loginType, this.context, this.page, '', cookieStr);

            await loginObj.begin();
            await this.client.updateCookies(this.context);
        }
        //Check whether a1 is in cookies
        try {
            if(this.context) {

                const cookies = await this.context.cookies();
                const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
                // const cookieDict = Object.fromEntries(cookies.map(c => [c.name, c.value]));

                logger.info(`[loginXiaoHongShu] cookies after login: ${cookieString}`);

                // 重点：找 a1
                const a1Cookie = cookies.find(c => c.name === 'a1');
                if (a1Cookie) {
                logger.info(`[loginXiaoHongShu] Found a1: ${a1Cookie.value}`);
                } else {
                logger.warn('[loginXiaoHongShu] a1 NOT FOUND in cookies!');
                }
                }else{
                    logger.info('[xhsLogin]: context is null')
                }
            } catch (error: any) {
            logger.error(`[loginXiaoHongShu] Error: ${error.message}`);
        }

        

        // CrawlerType.set(config.CRAWLER_TYPE);
        if(task) {
            switch (task) {
                case 'login':
                    await this.loginXiaoHongShu(loginType, cookieStr);
                    break;
                case 'detail':
                    // await this.getSpecifiedNotes();
                    break;
                case 'creator':
                    // await this.getCreatorsAndNotes();
                    break;
                default:
                    break;
            }

        }

        logger.info("[XiaoHongShuCrawler.start] Xhs Crawler finished ...");
    }

    /**
     * 登录小红书
     * @param loginType - 登录类型（'qrcode' | 'phone' | 'cookie'）
     * @param cookieStr - 如果使用 cookie 登录，传入 cookie 字符串
     */
    public async loginXiaoHongShu(
        loginType: 'qrcode' | 'phone' | 'cookie',
        cookieStr: string = ''
    ): Promise<void> {
        try {
            if(this.context) {

                const cookies = await this.context.cookies();
                const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
                const cookieDict = Object.fromEntries(cookies.map(c => [c.name, c.value]));

                logger.info(`[loginXiaoHongShu] cookies after login: ${cookieString}`);

                // 重点：找 a1
                const a1Cookie = cookies.find(c => c.name === 'a1');
                if (a1Cookie) {
                logger.info(`[loginXiaoHongShu] Found a1: ${a1Cookie.value}`);
                } else {
                logger.warn('[loginXiaoHongShu] a1 NOT FOUND in cookies!');
                }
                }else{
                    logger.info('[xhsLogin]: context is null')
                }
            } catch (error: any) {
            logger.error(`[loginXiaoHongShu] Error: ${error.message}`);
        }
    }

    /**
     * 确保已登录，如果未登录且启用自动登录，则执行登录流程
     */
    private async ensureLoggedIn(
        autoLogin: boolean,
        loginType?: 'qrcode' | 'phone' | 'cookie',
        cookieStr?: string
    ): Promise<void> {
        if (!this.client) {
            logger.info('There is no client');
            logger.info(`autoLogin ${autoLogin}, loginType: ${loginType}`);
            if (autoLogin && loginType) {
                logger.info('[xhsService] 未登录，自动执行登录流程...');
                await this.loginXiaoHongShu(loginType, cookieStr);
            } else {
                throw new Error('xhsClient 未初始化，请先手动登录或启用autoLogin');
            }
        } else {
            // const isLogged = await this.client.pong();
            const isLogged = false;
            logger.info(`[xhsService] 登录状态: ${isLogged}`);
            if (!isLogged && autoLogin && loginType) {
                logger.info('[xhsService] Cookie 失效，自动再次登录...');
                await this.loginXiaoHongShu(loginType, cookieStr);
            } else if (!isLogged) {
                // await this.loginXiaoHongShu(loginType, cookieStr);
                throw new Error('xhsClient 未登录或已失效，请先调用 loginXiaoHongShu 或启用 autoLogin');
            }
        }
    }

    /**
     * 获取笔记详情
     */
    public async getXiaoHongShuDetail(
        noteId: string,
        xsec_source: string,
        xsec_token: string,
        autoLogin: boolean = false,
        loginType?: 'qrcode' | 'phone' | 'cookie',
        cookieStr?: string
    ): Promise<any> {
        await this.ensureLoggedIn(autoLogin, loginType, cookieStr);

        if (!this.client) {
            throw new Error('xhsClient 未初始化');
        }
        return this.client.getNoteById(noteId, xsec_source, xsec_token);
    }

    /**
     * 获取创作者信息
     */
    public async getCreatorInfoByID(
        creatorID: string,
        autoLogin: boolean = true,
        loginType?: 'qrcode' | 'phone' | 'cookie',
        cookieStr?: string
    ): Promise<any> {
        await this.ensureLoggedIn(autoLogin, loginType, cookieStr);

        if (!this.client) {
            throw new Error('xhsClient 未初始化');
        }
        return this.client.getCreatorInfo(creatorID);
    }

    /**
     * 获取创作者的所有笔记
     */
    public async getAllNotesByCreatorId(
        creatorId: string,
        crawlInterval: number = 1.0,
        callback?: (notes: any[]) => Promise<void>,
        autoLogin: boolean = true,
        loginType?: 'qrcode' | 'phone' | 'cookie',
        cookieStr?: string,
        maxCount: number | null = null
    ): Promise<any[]> {
        // await this.ensureLoggedIn(autoLogin, loginType, cookieStr);

        logger.error('getAllNotesByCreatorId: ensured Login');

        if (!this.client) {
            throw new Error('xhsClient 未初始化');
        }

        logger.error('Try to get all notes by creator');
        const allNotes: any[] = await this.client.getAllNotesByCreator(creatorId, crawlInterval, async (notes: any) => {
            if (callback) {
                await callback(notes);
            }
        });
        logger.error('Successful get all notes by creator');

        if (maxCount !== null && allNotes.length > maxCount) {
            return allNotes.slice(0, maxCount);
        }

        return allNotes;
    }

    /**
     * 直接在 xhsService 中新增的方法：
     * 根据 userId 获取指定数量（maxCount）的笔记，并逐条获取笔记详情。
     * 不再获取评论。
     */
    public async getCreatorAndNotes(
        userId: string,
        maxCount: number,
        autoLogin: boolean = true,
        loginType?: 'qrcode',
        cookieStr?: string
    ): Promise<any[]> {
        // 1. 确保已登录
        logger.info('check whether it logged in');
        await this.ensureLoggedIn(autoLogin, loginType, cookieStr);
        logger.info('after ensuredLogged in');


        if (!this.client) {
            throw new Error('xhsClient 未初始化');
        }

        logger.info(`[xhsService.getCreatorAndNotes] 获取创作者ID = ${userId} 的笔记，最多 ${maxCount} 条`);

        // 2. 执行一次性获取该用户所有笔记（或部分笔记）：
        //    传入 maxCount，用于截断
        const allNotes = await this.getAllNotesByCreatorId(
            userId,
            1.0,        // crawlInterval
            undefined,   // 无需在每次分页回调里获取详情，可直接最后再获取
            autoLogin,
            loginType,
            cookieStr,
            maxCount
        );

        logger.info(`[xhsService.getCreatorAndNotes] 已获取到笔记数量: ${allNotes.length}`);

        // 3. 并发获取每条笔记的详情（HTML + API 多次尝试）
        const limit = pLimit(5); // 并发限制，如需要可调大/小
        const detailTasks = allNotes.map(note => limit(async () => {
            // 先尝试带 Cookie 的 HTML
            let detail = await this.client!.getNoteByIdFromHtml(
                note.note_id,
                note.xsec_source,
                note.xsec_token,
                true
            );
            if (!detail) {
                // 如果失败，再试一下不带 Cookie 的 HTML
                detail = await this.client!.getNoteByIdFromHtml(
                    note.note_id,
                    note.xsec_source,
                    note.xsec_token,
                    false
                );
            }
            if (!detail) {
                // 如果还拿不到，就试 API
                detail = await this.client!.getNoteById(
                    note.note_id,
                    note.xsec_source,
                    note.xsec_token
                );
            }
            return detail || null;
        }));

        const detailResults = await Promise.all(detailTasks);
        // 过滤掉获取详情失败的
        const validDetails = detailResults.filter((d: null) => d !== null);

        logger.info(`[xhsService.getCreatorAndNotes] 成功获取到笔记详情数量: ${validDetails.length}`);

        // 4. 这里可根据需求写入数据库或返回
        //    例如: await xhs_store.update_xhs_notes(validDetails);
        return validDetails;
    }

    /**
     * 关闭浏览器
     */
    public async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            logger.info('[xhsService] 浏览器已关闭');
            this.browser = null;
            this.context = null;
            this.page = null;
            this.client = null;
        }
    }

    /**
     * 延迟函数
     */
    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
