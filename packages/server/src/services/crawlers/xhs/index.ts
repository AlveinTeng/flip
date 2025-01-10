// src/crawlers/mediaPlatforms/xiaohongshu/index.ts

/**
 * 声明：本代码仅供学习和研究目的使用。使用者应遵守以下原则：
 * 1. 不得用于任何商业用途。
 * 2. 使用时应遵守目标平台的使用条款和robots.txt规则。
 * 3. 不得进行大规模爬取或对平台造成运营干扰。
 * 4. 应合理控制请求频率，避免给目标平台带来不必要的负担。
 * 5. 不得用于任何非法或不当的用途。
 *
 * 详细许可条款请参阅项目根目录下的LICENSE文件。
 * 使用本代码即表示您同意遵守上述原则和LICENSE中的所有条款。
 */

import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { logger } from '../../../utils/crawlers/logger.js';
import { xhsLogin } from '../../../crawlers/mediaPlatforms/xhs/login.js'; // 假设你已经实现了 XiaoHongShuLogin 类
import { xhsClient } from '../../../crawlers/mediaPlatforms/xhs/client.js'; // 你的 XiaoHongShuClient 类
import { DataFetchError, IPBlockError } from '../../../exceptions/crawler.js';

export class xhsService{
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private client: xhsClient | null = null;

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
            if (this.browser) {
                await this.close();
            }

            this.browser = await chromium.launch({ headless: false });
            this.context = await this.browser.newContext();
            this.page = await this.context.newPage();

            const Login = new xhsLogin(loginType, this.context, this.page, '', cookieStr);
            await Login.begin();

            const cookies = await this.context.cookies();
            const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

            logger.info(`[XiaoHongShuService] 登录成功，Cookie = ${cookieString}`);

            this.client = new xhsClient({
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Cookie': cookieString,
                    'Content-Type': 'application/json',
                },
                playwrightPage: this.page,
                cookieDict: Object.fromEntries(cookies.map(c => [c.name, c.value])),
            });
        } catch (error: any) {
            logger.error(`[XiaoHongShuService] 登录失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 确保已登录，如果未登录且启用自动登录，则执行登录流程
     * @param autoLogin - 是否启用自动登录
     * @param loginType - 登录类型
     * @param cookieStr - 如果使用 cookie 登录，传入 cookie 字符串
     */
    private async ensureLoggedIn(
        autoLogin: boolean,
        loginType?: 'qrcode' | 'phone' | 'cookie',
        cookieStr?: string
    ): Promise<void> {
        if (!this.client) {
            if (autoLogin && loginType) {
                logger.info('[XiaoHongShuService] 未登录，自动执行登录流程...');
                await this.loginXiaoHongShu(loginType, cookieStr);
            } else {
                throw new Error('XiaoHongShuClient 未初始化，请先手动登录或在调用方法时设置autoLogin=true并传loginType');
            }
        } else {
            const isLogged = await this.client.pong();
            if (!isLogged && autoLogin && loginType) {
                logger.info('[XiaoHongShuService] Cookie 失效，自动再次登录...');
                await this.loginXiaoHongShu(loginType, cookieStr);
            } else if (!isLogged) {
                throw new Error('XiaoHongShuClient 未登录或已失效，请先调用 loginXiaoHongShu 或启用 autoLogin');
            }
        }
    }

    /**
     * 根据关键词搜索笔记
     * @param keyword - 搜索关键词
     * @param page - 分页数
     * @param autoLogin - 是否启用自动登录
     * @param loginType - 登录类型
     * @param cookieStr - 如果使用 cookie 登录，传入 cookie 字符串
     * @returns 搜索结果
     */
    // public async searchXiaoHongShu(
    //     keyword: string,
    //     page: number = 1,
    //     autoLogin: boolean = false,
    //     loginType?: 'qrcode' | 'phone' | 'cookie',
    //     cookieStr?: string
    // ): Promise<any> {
    //     await this.ensureLoggedIn(autoLogin, loginType, cookieStr);

    //     if (!this.client) {
    //         throw new Error('XiaoHongShuClient 未初始化');
    //     }
    //     return this.client.getNoteByKeyword(keyword, page);
    // }

    /**
     * 获取笔记详情
     * @param noteId - 笔记 ID
     * @param xsec_source - 渠道来源
     * @param xsec_token - 验证 token
     * @param autoLogin - 是否启用自动登录
     * @param loginType - 登录类型
     * @param cookieStr - 如果使用 cookie 登录，传入 cookie 字符串
     * @returns 笔记详情
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
            throw new Error('XiaoHongShuClient 未初始化');
        }
        return this.client.getNoteById(noteId, xsec_source, xsec_token);
    }

    /**
     * 获取创作者信息
     * @param creatorID - 创作者 ID
     * @param autoLogin - 是否启用自动登录
     * @param loginType - 登录类型
     * @param cookieStr - 如果使用 cookie 登录，传入 cookie 字符串
     * @returns 创作者信息
     */
    public async getCreatorInfoByID(
        creatorID: string,
        autoLogin: boolean = true,
        loginType?: 'qrcode' | 'phone' | 'cookie',
        cookieStr?: string
    ): Promise<any> {
        await this.ensureLoggedIn(autoLogin, loginType, cookieStr);

        if (!this.client) {
            throw new Error('XiaoHongShuClient 未初始化');
        }
        return this.client.getCreatorInfo(creatorID);
    }

    /**
     * 获取创作者的所有笔记
     * @param creatorId - 创作者 ID
     * @param crawlInterval - 爬取间隔（秒）
     * @param callback - 回调函数，每次获取一批笔记后调用
     * @param autoLogin - 是否启用自动登录
     * @param loginType - 登录类型
     * @param cookieStr - 如果使用 cookie 登录，传入 cookie 字符串
     * @param maxCount - 最大爬取数量
     * @returns 笔记列表
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
        await this.ensureLoggedIn(autoLogin, loginType, cookieStr);

        if (!this.client) {
            throw new Error('XiaoHongShuClient 未初始化');
        }

        const creatorInfo = await this.client.getCreatorInfo(creatorId);
        const lfidContainerId = creatorInfo.lfid_container_id;
        if (!lfidContainerId) {
            throw new Error('获取用户容器信息失败, 无法继续');
        }

        const result: any[] = [];
        let notesHasMore = true;
        let sinceId = 0;
        let crawlerTotalCount = 0;

        while (notesHasMore) {
            const notesRes = await this.client.getNotesByCreator(creatorId, lfidContainerId, sinceId);
            if (!notesRes) {
                logger.error(`[XiaoHongShuService] 用户 ${creatorId} 的数据可能被封禁或无法访问`);
                break;
            }

            sinceId = parseInt(notesRes.cardlistInfo?.since_id || '0', 10);

            if (!notesRes.cards) {
                logger.info(`[XiaoHongShuService] 响应中未找到 'cards'，原始响应: ${JSON.stringify(notesRes)}`);
                break;
            }

            const notes = notesRes.cards.filter((note: any) => note.card_type === 9);
            logger.info(`[XiaoHongShuService] 本轮获取到用户 ${creatorId} 的帖子数量: ${notes.length}`);

            if (callback) {
                await callback(notes);
            }

            result.push(...notes);
            crawlerTotalCount += notes.length;

            if (maxCount !== null && result.length >= maxCount) {
                logger.info(`[XiaoHongShuService] 达到最大爬取数量限制: ${maxCount}`);
                return result.slice(0, maxCount);
            }

            await this.sleep(crawlInterval * 1000);

            const total = notesRes.cardlistInfo?.total ?? 0;
            notesHasMore = total > crawlerTotalCount;
        }

        logger.info(`[XiaoHongShuService] 用户 ${creatorId} 的所有帖子获取完毕, 总数 = ${result.length}`);
        return result;
    }

    /**
     * 关闭浏览器实例
     */
    public async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            logger.info('[XiaoHongShuService] 浏览器已关闭');
            this.browser = null;
            this.context = null;
            this.page = null;
            this.client = null;
        }
    }

    /**
     * 延迟函数
     * @param ms - 延迟毫秒数
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
