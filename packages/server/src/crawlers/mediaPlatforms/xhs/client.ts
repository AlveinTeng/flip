// src/crawlers/mediaPlatforms/xiaohongshu/client.ts

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BrowserContext, Page } from 'playwright';
import { BaseApiClient } from '../../base/baseApiClient.js';
import { DataFetchError, IPBlockError } from '../../../exceptions/crawler.js';
import { SearchNoteType, SearchSortType, NoteUrlInfo } from './field.js';
import { get_search_id, sign } from './help.js';
import { extractUrlParamsToDict } from '../../../utils/crawlers/crawler_util.js';
import { logger } from '../../../utils/crawlers/logger.js';

interface XiaoHongShuClientOptions {
    timeout?: number;
    proxies?: any;
    headers: Record<string, string>;
    playwrightPage: Page;
    cookieDict: Record<string, string>;
}

export class XiaoHongShuClient implements BaseApiClient {
    private proxies: any;
    private timeout: number;
    private headers: Record<string, string>;
    private playwrightPage: Page;
    private cookieDict: Record<string, string>;

    private _host: string = 'https://edith.xiaohongshu.com';
    private _domain: string = 'https://www.xiaohongshu.com';
    private IP_ERROR_STR: string = "网络连接异常，请检查网络设置或重启试试";
    private IP_ERROR_CODE: number = 300012;
    private NOTE_ABNORMAL_STR: string = "笔记状态异常，请稍后查看";
    private NOTE_ABNORMAL_CODE: number = -510001;

    constructor(opts: XiaoHongShuClientOptions) {
        this.proxies = opts.proxies;
        this.timeout = opts.timeout ?? 10;
        this.headers = opts.headers;
        this.playwrightPage = opts.playwrightPage;
        this.cookieDict = opts.cookieDict;
    }

    async _preHeaders(url: string, data?: Record<string, any>): Promise<Record<string, string>> {
        // Evaluating JavaScript on the page (now with type assertion for `window`)
        const window = globalThis as any; 
        const encryptParams = await this.playwrightPage.evaluate(
            ([url, data]) => {
                return window._webmsxyw(url, data);
            },
            [url, data]
        );
    
        // Retrieving localStorage (still works in the browser context)
        const localStorage = await this.playwrightPage.evaluate(() => {
            return window.localStorage;
        }) as Record<string, string>;
    
        // Signing the headers
        const b1 = await this.playwrightPage.evaluate(() => localStorage["b1"] || "");
        const signs = sign(this.cookieDict["a1"] || "", b1, encryptParams["X-s"] || "", String(encryptParams["X-t"] || ""));
    
        // Preparing the headers object
        const headers = {
            "X-S": signs["x-s"],
            "X-T": signs["x-t"],
            "x-S-Common": signs["x-s-common"],
            "X-B3-Traceid": signs["x-b3-traceid"],
        };
    
        // Updating the class's headers
        this.headers = { ...this.headers, ...headers };
    
        return this.headers;
    }
    

    /**
     * 封装 httpx 的公共请求方法，对请求响应做一些处理
     * @param method - 请求方法
     * @param url - 请求的 URL
     * @param extra - 其他请求参数
     * @returns 响应数据
     */
    public async request(method: string, url: string, extra?: any): Promise<any> {
        const enableReturnResponse = extra?.return_response || false;
        const client: AxiosInstance = axios.create({
            proxy: this.proxies,
            timeout: this.timeout * 1000,
            headers: extra?.headers || this.headers,
        });

        try {
            const response: AxiosResponse = await client.request({
                method,
                url,
                data: extra?.data,
            });

            if (enableReturnResponse) {
                return response;
            }

            const data = response.data;
            if (data?.success) {
                return data.data || data.success;
            } else if (data?.code === this.IP_ERROR_CODE) {
                logger.error(`[XiaoHongShuClient.request] IP blocked: ${data.msg || 'unknown error'}`);
                throw new IPBlockError(data.msg || 'IP blocked');
            } else {
                logger.error(`[XiaoHongShuClient.request] Error in response: ${JSON.stringify(data)}`);
                throw new DataFetchError(data.msg || 'unknown error');
            }
        } catch (error: any) {
            logger.error(`[XiaoHongShuClient.request] Request failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * GET 请求，对请求头签名
     * @param uri - 请求路由
     * @param params - 请求参数
     * @returns 响应数据
     */
    public async get(uri: string, params?: Record<string, any>): Promise<any> {
        let final_uri = uri;
        if (params) {
            const queryString = new URLSearchParams(params).toString();
            final_uri = `${uri}?${queryString}`;
        }
        const fullUrl = `${this._host}${final_uri}`;
        const headers = await this._preHeaders(fullUrl);

        return this.request('GET', fullUrl, { headers });
    }

    /**
     * POST 请求，对请求头签名
     * @param uri - 请求路由
     * @param data - 请求体参数
     * @param extra - 其他请求参数
     * @returns 响应数据
     */
    public async post(uri: string, data: Record<string, any>, extra?: any): Promise<any> {
        const fullUrl = `${this._host}${uri}`;
        const headers = await this._preHeaders(fullUrl, data);

        const json_str = JSON.stringify(data, null, 0);
        return this.request('POST', fullUrl, {
            data: json_str,
            headers,
            ...extra,
        });
    }

    /**
     * 获取笔记媒体内容
     * @param url - 媒体 URL
     * @returns 媒体内容（字节数组）或 null
     */
    public async getNoteMedia(url: string): Promise<Buffer | null> {
        try {
            const response: AxiosResponse = await axios.get(url, {
                proxy: this.proxies,
                timeout: this.timeout * 1000,
                responseType: 'arraybuffer',
                headers: this.headers,
            });

            if (response.status !== 200) {
                logger.error(`[XiaoHongShuClient.get_note_media] Request failed: ${url}`);
                return null;
            }

            return Buffer.from(response.data);
        } catch (error: any) {
            logger.error(`[XiaoHongShuClient.get_note_media] Error fetching media: ${error.message}`);
            return null;
        }
    }

    /**
     * 检查登录态是否失效
     * @returns 登录状态是否有效
     */
    public async pong(): Promise<boolean> {
        logger.info('[XiaoHongShuClient.pong] Begin to pong xhs...');
        let pingFlag = false;
        try {
            const note_card = await this.getNoteByKeyword("小红书");
            if (note_card?.items) {
                pingFlag = true;
            } else {
                logger.error('[XiaoHongShuClient.pong] Cookie may be invalid');
            }
        } catch (err: any) {
            logger.error(`[XiaoHongShuClient.pong] Ping xhs failed: ${err.message}, and try to login again...`);
            pingFlag = false;
        }
        return pingFlag;
    }

    /**
     * 更新 Cookies
     * @param browser_context - 浏览器上下文对象
     */
    public async updateCookies(creatorId: string, browserContext: BrowserContext): Promise<void> {
        const page = await browserContext.newPage();
        const url = `https://edith.xiaohongshu.com`;
        logger.info(`Navigating to URL: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const cookies = await browserContext.cookies();
        const cookieStr = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

        logger.info(`[XiaoHongShuClient.updateCookies] Updated Cookie: ${cookieStr}`);
        this.headers['Cookie'] = cookieStr;
        this.cookieDict = cookies.reduce((dict, cookie) => {
            dict[cookie.name] = cookie.value;
            return dict;
        }, {} as Record<string, string>);
    }

    /**
     * 根据关键词搜索笔记
     * @param keyword - 关键词参数
     * @param search_id - 搜索 ID
     * @param page - 分页第几页
     * @param page_size - 分页数据长度
     * @param sort - 搜索结果排序指定
     * @param note_type - 搜索的笔记类型
     * @returns 搜索结果
     */
    public async getNoteByKeyword(
        keyword: string,
        search_id: string = get_search_id(),
        page: number = 1,
        page_size: number = 20,
        sort: SearchSortType = SearchSortType.GENERAL,
        note_type: SearchNoteType = SearchNoteType.ALL,
    ): Promise<any> {
        const uri = "/api/sns/web/v1/search/notes";
        const data = {
            "keyword": keyword,
            "page": page,
            "page_size": page_size,
            "search_id": search_id,
            "sort": sort,
            "note_type": note_type,
        };
        return this.post(uri, data);
    }

    /**
     * 获取笔记详情
     * @param note_id - 笔记 ID
     * @param xsec_source - 渠道来源
     * @param xsec_token - 验证 token
     * @returns 笔记详情
     */
    public async getNoteById(
        note_id: string,
        xsec_source: string,
        xsec_token: string
    ): Promise<any> {
        if (!xsec_source) {
            xsec_source = "pc_search";
        }

        const data = {
            "source_note_id": note_id,
            "image_formats": ["jpg", "webp", "avif"],
            "extra": { "need_body_topic": 1 },
            "xsec_source": xsec_source,
            "xsec_token": xsec_token,
        };
        const uri = "/api/sns/web/v1/feed";
        const res = await this.post(uri, data);
        if (res && res.items) {
            return res.items[0].note_card;
        }
        logger.error(`[XiaoHongShuClient.get_note_by_id] Note ID: ${note_id} returned empty result: ${JSON.stringify(res)}`);
        return {};
    }

    /**
     * 获取笔记的一级评论
     * @param note_id - 笔记 ID
     * @param xsec_token - 验证 token
     * @param cursor - 分页游标
     * @returns 评论数据
     */
    public async getComments(
        note_id: string,
        xsec_token: string,
        cursor: string = ""
    ): Promise<any> {
        const uri = "/api/sns/web/v2/comment/page";
        const params = {
            "note_id": note_id,
            "cursor": cursor,
            "top_comment_id": "",
            "image_formats": "jpg,webp,avif",
            "xsec_token": xsec_token,
        };
        return this.get(uri, params);
    }

    /**
     * 获取指定父评论下的子评论
     * @param note_id - 笔记 ID
     * @param root_comment_id - 根评论 ID
     * @param xsec_token - 验证 token
     * @param num - 分页数量
     * @param cursor - 分页游标
     * @returns 子评论数据
     */
    public async getSubComments(
        note_id: string,
        root_comment_id: string,
        xsec_token: string,
        num: number = 10,
        cursor: string = ""
    ): Promise<any> {
        const uri = "/api/sns/web/v2/comment/sub/page";
        const params = {
            "note_id": note_id,
            "root_comment_id": root_comment_id,
            "num": num,
            "cursor": cursor,
            "image_formats": "jpg,webp,avif",
            "top_comment_id": "",
            "xsec_token": xsec_token,
        };
        return this.get(uri, params);
    }

    /**
     * 获取指定笔记下的所有一级评论
     * @param note_id - 笔记 ID
     * @param xsec_token - 验证 token
     * @param crawl_interval - 爬取一次的延迟单位（秒）
     * @param callback - 回调函数
     * @param max_count - 最大评论数量
     * @returns 评论列表
     */
    public async getAllComments(
        note_id: string,
        xsec_token: string,
        crawl_interval: number = 1.0,
        callback?: (nid: string, cList: any[]) => Promise<void>,
        max_count: number = 10,
    ): Promise<any[]> {
        const result: any[] = [];
        let isEnd: boolean = false;
        let cursor: string = "";

        while (!isEnd && result.length < max_count) {
            const commentsRes = await this.getComments(note_id, xsec_token, cursor);
            cursor = commentsRes?.cursor || "";
            isEnd = !commentsRes?.has_more;

            let commentList: any[] = commentsRes?.comments || [];
            if (result.length + commentList.length > max_count) {
                commentList = commentList.slice(0, max_count - result.length);
            }

            if (callback) {
                await callback(note_id, commentList);
            }

            await this.sleep(crawl_interval * 1000);
            result.push(...commentList);

            const subCommentResult = await this.getAllSubComments(
                note_id,
                commentList,
                xsec_token,
                crawl_interval,
                callback
            );
            result.push(...subCommentResult);
        }
        return result;
    }

    /**
     * 获取指定一级评论下的所有二级评论
     * @param note_id - 笔记 ID
     * @param commentList - 评论列表
     * @param xsec_token - 验证 token
     * @param crawl_interval - 爬取延迟
     * @param callback - 回调函数
     * @returns 子评论列表
     */
    public async getAllSubComments(
        note_id: string,
        commentList: any[],
        xsec_token: string,
        crawl_interval: number = 1.0,
        callback?: (nid: string, cList: any[]) => Promise<void>,
    ): Promise<any[]> {
        const resSubComments: any[] = [];
        for (const comment of commentList) {
            const subComments = comment.comments;
            if (subComments && Array.isArray(subComments)) {
                if (callback) {
                    await callback(note_id, subComments);
                }
                resSubComments.push(...subComments);
            }

            let sub_comment_has_more = comment.sub_comment_has_more;
            if (!sub_comment_has_more) continue;

            const root_comment_id = comment.id;
            let sub_comment_cursor = comment.sub_comment_cursor;

            while (sub_comment_has_more) {
                const commentsRes = await this.getSubComments(
                    note_id,
                    root_comment_id,
                    xsec_token,
                    10,
                    sub_comment_cursor
                );
                sub_comment_has_more = commentsRes?.has_more;
                sub_comment_cursor = commentsRes?.cursor || "";
                const comments = commentsRes?.comments || [];

                if (!comments.length) break;

                if (callback) {
                    await callback(note_id, comments);
                }
                await this.sleep(crawl_interval * 1000);
                resSubComments.push(...comments);
            }
        }
        return resSubComments;
    }

    /**
     * 获取创作者的容器信息
     * @param user_id - 用户 ID
     * @returns 容器信息
     */
    public async getCreatorInfo(user_id: string): Promise<any> {
        const uri = `/user/profile/${user_id}`;
        const html_content = await this.request("GET", `${this._domain}${uri}`, { return_response: true });

        const match = html_content.match(/window\.__INITIAL_STATE__=({.*})<\/script>/m);
        if (!match) {
            return {};
        }

        let state = match[1].replace(/:undefined/g, ':""');
        try {
            const info = JSON.parse(state);
            return info.user.userPageData;
        } catch (error) {
            logger.error(`[XiaoHongShuClient.get_creator_info] JSON parse error: ${error}`);
            return {};
        }
    }

    /**
     * 获取创作者的笔记
     * @param creator - 创作者 ID
     * @param cursor - 上一页最后一条笔记的 ID
     * @param page_size - 分页数据长度
     * @returns 笔记数据
     */
    public async getNotesByCreator(
        creator: string,
        cursor: string,
        page_size: number = 30
    ): Promise<any> {
        const uri = "/api/sns/web/v1/user_posted";
        const data = {
            "user_id": creator,
            "cursor": cursor,
            "num": page_size,
            "image_formats": "jpg,webp,avif",
        };
        return this.post(uri, data);
    }

    /**
     * 获取指定用户下的所有笔记
     * @param user_id - 用户 ID
     * @param crawl_interval - 爬取延迟（秒）
     * @param callback - 回调函数
     * @returns 笔记列表
     */
    public async getAllNotesByCreator(
        user_id: string,
        crawl_interval: number = 1.0,
        callback?: (notes: any[]) => Promise<void>,
    ): Promise<any[]> {
        const result: any[] = [];
        let notes_has_more: boolean = true;
        let notes_cursor: string = "";

        while (notes_has_more) {
            const notes_res = await this.getNotesByCreator(user_id, notes_cursor);
            if (!notes_res) {
                logger.error(`[XiaoHongShuClient.get_all_notes_by_creator] Creator may be banned, unable to access data.`);
                break;
            }

            notes_has_more = notes_res.has_more;
            notes_cursor = notes_res.cursor || "";
            const notes = notes_res.notes || [];

            logger.info(`[XiaoHongShuClient.get_all_notes_by_creator] Fetched ${notes.length} notes for user_id: ${user_id}`);

            if (callback) {
                await callback(notes);
            }

            await this.sleep(crawl_interval * 1000);
            result.push(...notes);
        }
        return result;
    }

    /**
     * 获取笔记的短链接
     * @param note_id - 笔记 ID
     * @returns 短链接数据
     */
    public async getNoteShortUrl(note_id: string): Promise<any> {
        const uri = `/api/sns/web/short_url`;
        const data = { "original_url": `${this._domain}/discovery/item/${note_id}` };
        return this.post(uri, data, { return_response: true });
    }

    /**
     * 通过解析网页版的笔记详情页 HTML，获取笔记详情
     * @param note_id - 笔记 ID
     * @param xsec_source - 渠道来源
     * @param xsec_token - 验证 token
     * @param enable_cookie - 是否启用 Cookie
     * @returns 笔记详情
     */
    public async getNoteIdFromHtml(
        note_id: string,
        xsec_source: string,
        xsec_token: string,
        enable_cookie: boolean = false,
    ): Promise<any | null> {
        const url = `${this._domain}/explore/${note_id}?xsec_token=${xsec_token}&xsec_source=${xsec_source}`;
        const copy_headers = { ...this.headers };
        if (!enable_cookie) {
            delete copy_headers["Cookie"];
        }

        try {
            const html = await this.request("GET", url, { headers: copy_headers, return_response: true });

            const match = html.match(/window\.__INITIAL_STATE__=({.*})<\/script>/);
            if (!match) {
                return null;
            }

            let state = match[1].replace(/:undefined/g, ':""');
            const info = JSON.parse(state);
            return info.note.note_detail_map[note_id].note;
        } catch (error: any) {
            logger.error(`[XiaoHongShuClient.get_note_by_id_from_html] Error fetching note details: ${error.message}`);
            return null;
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
