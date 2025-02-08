// src/crawlers/mediaPlatforms/xhs/client.ts

import fetch, { RequestInit } from 'node-fetch';
import { Page } from 'playwright';
import { logger } from '../../../utils/crawlers/logger.js';
import { DataFetchError, IPBlockError } from '../../../exceptions/crawler.js';
import { sign } from './help.js';
import { SearchNoteType } from './field.js';
// import {encodeUtf8AndBase64} from './help.js'
// 这里可以和 Python 保持一致
const IP_ERROR_CODE = 300012;

interface XhsClientOptions {
  headers: Record<string, string>;
  playwrightPage: Page;
  cookieDict: Record<string, string>;
  proxies?: any; // 如果要支持代理，按需扩展
  timeout?: number;
}

export class xhsClient {
  private headers: Record<string, string>;
  private playwrightPage: Page;
  private cookieDict: Record<string, string>;
  private proxies?: any;
  private timeout: number;

  // 用于识别 IP Block / Note Abnormal 等错误的字符串/错误码
  private IP_ERROR_STR = '网络连接异常，请检查网络设置或重启试试';
  private NOTE_ABNORMAL_STR = '笔记状态异常，请稍后查看';
  private NOTE_ABNORMAL_CODE = -510001;

  private host = 'https://edith.xiaohongshu.com';
  private domain = 'https://www.xiaohongshu.com';

  constructor(options: XhsClientOptions) {
    this.headers = options.headers;
    this.playwrightPage = options.playwrightPage;
    this.cookieDict = options.cookieDict;
    this.proxies = options.proxies;
    this.timeout = options.timeout ?? 10 * 1000; // 毫秒
  }

  /**
   * 用于给请求头加签名
   */
  // private async preHeaders(url: string, data?: any): Promise<Record<string, string>> {
  

  //   await this.playwrightPage.goto('https://www.xiaohongshu.com', { waitUntil: 'load' });
  //   // 1. 检查并调用 window._webmsxyw(url, data)
  //   const encryptParams = await this.playwrightPage.evaluate(([u, d]) => {
  //     //@ts-ignore
  //     if (typeof (window as any)._webmsxyw !== 'function') {
  //       throw new Error('window._webmsxyw is not defined or is not a function');
  //     }
  //     //@ts-ignore
  //     return (window as any)._webmsxyw(u, d);
  //   }, [url, data]);
  
  //   // 2. 获取 localStorage 里的 b1
  //   const localStorage: Record<string, string> = await this.playwrightPage.evaluate(() => {
  //     return Object.fromEntries(Object.entries(localStorage));
  //   });
  //   logger.error(`localStorage is ${localStorage}`);
  
  //   // 3. 调用 sign(...) 进行进一步签名
    // const signs = sign(
    //   '1944513ecackf9el2k24gi2pfs318ztgnol4ztwwf30000180555',
    //   'I38rHdgsjopgIvesdVwgIC+oIELmBZ5e3VwXLgFTIxS3bqwErFeexd0ekncAzMFYnqthIhJeSnMDKutRI3KsYorWHPtGrbV0P9WfIi/eWc6eYqtyQApPI37ekmR1QL+5Ii3sdnoeSfGYHqwl2qt5B0DoIx+PGDi/sVtkIxdsxuwb4qtkIhuaIE3e3LV0I3VTIC7e0utl2ADmsLveDSKsSPw5IEvsiVtJOqw8BuwfPpdeTFWOIx4TIiu6ZPwrPut5IvlaLbgs3qtxIxes1VwHIkumIkIyejgsY/WTge7eSqte/D7sDcpipedeYrDtIC6eDVw2IENsSqtlnlSuNjVtIx5e1qt3bmAeVn8LIESGIhEe+AFDI3EPKI8BIiW7ZPwFIvGj4sesYINsxVwSIC7efnJe0fEqIiAe6WrS8qwUIE7s1f0s6WAeiVtwpjNeYuw7Ivl8ze0efVwEg9JsWVw8IxI2I38isqwZgVtPzg8QwcNejd/eiqwoIhAsS/AskFRYIk/s0MvskdE0IhgsiVwDIhGdQqwJ8ut9I33e3PtVIiNsiqwlIh/eDqtAHPwPmVwDI3MdIv4pH9ztrY3s3qwEIiT+IiesfPwoeWccpj3sDskuIkGyGuwbmPwhICdekVtUQpdeipJsTrELIhvs6m3ejPtsoI==',
    //   encryptParams['X-s'] ?? '',
    //   String(encryptParams['X-t'] ?? ''),
    // );

  //   // logger.error(`cookieDict['a1']: ${this.cookieDict['a1']},
  //   //              localStorage ${localStorage['b1']},
  //   //              encryptParams ${encryptParams},
  //   //              x-t ${String(encryptParams['X-t'])}`);
  //   // logger.error(`Signs is x-s: ${signs['x-s']}, x-t: ${signs['x-t']}, x-s-common: ${signs['x-s-common']}, b3: ${signs['x-b3-traceid']}`);
  
  //   // 4. 返回带签名的 headers
  //   return {
  //     ...this.headers,
  //     'X-S': signs['x-s'],
  //     'X-T': signs['x-t'],
  //     'x-S-Common': signs['x-s-common'],
  //     'X-B3-Traceid': signs['x-b3-traceid'],
  //   };
  // }

  private async preHeaders(url: string, data?: any): Promise<Record<string, string>> {
    // ...
    await this.playwrightPage.goto('https://www.xiaohongshu.com', { waitUntil: 'load' });
    
    // 1. 打印一下 cookieDict['a1']
    logger.info(`[preHeaders] cookieDict['a1']: ${this.cookieDict['a1']}`);
  
    // 2. 获取 localStorage
    const localStorage: Record<string, string> = await this.playwrightPage.evaluate(() => {
      return Object.fromEntries(Object.entries(localStorage));
    });
    logger.info(`[preHeaders] localStorage: ${JSON.stringify(localStorage)}`);
  
    // 3. 检查 b1
    if (!localStorage['b1']) {
      logger.warn('[preHeaders] b1 is not found in localStorage!');
    }
  
    // 4. 调用 window._webmsxyw
    const encryptParams = await this.playwrightPage.evaluate(([u, d]) => {
      //@ts-ignore
      if (typeof (window as any)._webmsxyw !== 'function') {
        throw new Error('window._webmsxyw is not defined or is not a function');
      }
      //@ts-ignore
      return (window as any)._webmsxyw(u, d);
    }, [url, data]);
  
    // logger.info(`[preHeaders] encryptParams: ${JSON.stringify(encryptParams)}`);
  
    // 5. 调用 sign(...)
    const signs = sign(
      this.cookieDict['a1'] ?? '',
      localStorage['b1'] ?? '',
      encryptParams['X-s'] ?? '',
      String(encryptParams['X-t'] ?? ''),
    );
    // const signs = sign(
    //   '1944513ecackf9el2k24gi2pfs318ztgnol4ztwwf30000180555',
    //   'I38rHdgsjopgIvesdVwgIC+oIELmBZ5e3VwXLgFTIxS3bqwErFeexd0ekncAzMFYnqthIhJeSnMDKutRI3KsYorWHPtGrbV0P9WfIi/eWc6eYqtyQApPI37ekmR1QL+5Ii3sdnoeSfGYHqwl2qt5B0DoIx+PGDi/sVtkIxdsxuwb4qtkIhuaIE3e3LV0I3VTIC7e0utl2ADmsLveDSKsSPw5IEvsiVtJOqw8BuwfPpdeTFWOIx4TIiu6ZPwrPut5IvlaLbgs3qtxIxes1VwHIkumIkIyejgsY/WTge7eSqte/D7sDcpipedeYrDtIC6eDVw2IENsSqtlnlSuNjVtIx5e1qt3bmAeVn8LIESGIhEe+AFDI3EPKI8BIiW7ZPwFIvGj4sesYINsxVwSIC7efnJe0fEqIiAe6WrS8qwUIE7s1f0s6WAeiVtwpjNeYuw7Ivl8ze0efVwEg9JsWVw8IxI2I38isqwZgVtPzg8QwcNejd/eiqwoIhAsS/AskFRYIk/s0MvskdE0IhgsiVwDIhGdQqwJ8ut9I33e3PtVIiNsiqwlIh/eDqtAHPwPmVwDI3MdIv4pH9ztrY3s3qwEIiT+IiesfPwoeWccpj3sDskuIkGyGuwbmPwhICdekVtUQpdeipJsTrELIhvs6m3ejPtsoI==',
    //   encryptParams['X-s'] ?? '',
    //   String(encryptParams['X-t'] ?? ''),
    // );
    // logger.info(`[preHeaders] signs: ${JSON.stringify(signs)}`);
  
    return {
      ...this.headers,
      'X-S': signs['x-s'],
      'X-T': signs['x-t'],
      'x-S-Common': signs['x-s-common'],
      'X-B3-Traceid': signs['x-b3-traceid'],
    };
  }
  

  /**
   * 统一的请求方法，用于处理返回值、错误码等
   * @param method GET or POST
   * @param url    请求地址（加上 host）
   * @param options 其它参数，比如 body / params / returnResponse 等
   */
  private async request<T = any>(
    method: 'GET'|'POST',
    url: string,
    options: {
      body?: any;
      headers?: Record<string, string>;
      returnResponse?: boolean; // 用来决定是否返回原始响应文本
    } = {}
  ): Promise<T> {
    const { body, headers, returnResponse = false } = options;

    const requestOptions: RequestInit = {
      method,
      headers: {
        ...headers
      },
      body: method === 'POST' && body ? body : undefined,
    };

    // 如要支持代理，可以在这里添加 agent
    // if (this.proxies) { ... }

    const resp = await fetch(url, requestOptions);
    // 检查验证码等情况
    if (resp.status === 471 || resp.status === 461) {
      const verifyType = resp.headers.get('Verifytype');
      const verifyUuid = resp.headers.get('Verifyuuid');
      throw new Error(`出现验证码，Verifytype: ${verifyType}，Verifyuuid: ${verifyUuid},Response: ${resp}`);
    }

    const text = await resp.text();
    if (returnResponse) {
      // 直接返回文本给外部做正则解析
      return text as any;
    }
    // 这里默认返回 json，但要注意 try-catch
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      logger.error(`[xhsClient.request] JSON.parse error: ${e}`);
      throw new Error(`JSON 解析失败, 响应: ${text.slice(0, 100)}...`);
    }

    // 判断 success
    if (data.success) {
      return data.data || data.success;
    } else if (data.code === IP_ERROR_CODE) {
      throw new IPBlockError(this.IP_ERROR_STR);
    } else {
      throw new DataFetchError(data.msg || 'DataFetchError');
    }
  }

  /**
   * 发起 GET 请求（自带签名）
   */
  private async get(uri: string, params?: Record<string, any>): Promise<any> {
    let finalUri = uri;
    if (params) {
      const query = new URLSearchParams(params).toString();
      finalUri = uri + '?' + query;
    }
    const signedHeaders = await this.preHeaders(finalUri);
    return this.request('GET', `${this.host}${finalUri}`, { headers: signedHeaders });
  }

  /**
   * 发起 POST 请求（自带签名）
   */
  private async post(uri: string, data: any, extra?: { returnResponse?: boolean }): Promise<any> {
    const signedHeaders = await this.preHeaders(uri, data);
    // const bodyStr = JSON.stringify(data); // Python 里还有 ensure_ascii / separators 等，你可视需求而定
    const bodyStr = JSON.stringify(data, (key, value) => {
      // 可定制 JSON.stringify 的序列化行为
      return typeof value === 'string' ? value : value;
    });
    return this.request('POST', `${this.host}${uri}`, {
      headers: signedHeaders,
      body: bodyStr,
      returnResponse: extra?.returnResponse,
      ...extra,
    });
  }

  /**
   * 检测登录态是否还有效 (Python 里通过搜索一个“保底”笔记来判断)
   */
  public async pong(): Promise<boolean> {
    logger.info('[xhsClient.pong] Checking login state...');
    try {
      // 调用任意一个需要登录的接口试试，比如搜索
      const noteCard = await this.getNoteByKeyword('小红书');
      if (noteCard && noteCard.items) {
        return true;
      }
      return false;
    } catch (err) {
      logger.error(`[xhsClient.pong] Pong failed: ${err}`);
      return false;
    }
    // return true;
  }

  /**
   * 更新 Cookie，一般在登录后或者 Cookie 发生变化后调用
   */
  public async updateCookies(newCookieStr: string, newCookieDict: Record<string, string>) {
    this.headers['Cookie'] = newCookieStr;
    this.cookieDict = newCookieDict;
  }

  /**
   * 根据关键字搜索笔记
   */
  public async getNoteByKeyword(
    keyword: string,
    searchId: string = getRandomSearchId(),
    page: number = 1,
    pageSize: number = 20,
    sortType?: string, // 对应 SearchSortType
    noteType?: string  // 对应 SearchNoteType
  ): Promise<any> {
    const uri = '/api/sns/web/v1/search/notes';
    const reqData = {
      keyword,
      page,
      page_size: pageSize,
      search_id: searchId,
      sort: sortType ?? 'general',
      note_type: noteType ?? 0,
    };
    return this.post(uri, reqData);
  }

  /**
   * 根据 note_id 获取笔记详情
   */
  public async getNoteById(
    noteId: string,
    xsecSource: string,
    xsecToken: string
  ): Promise<any> {
    const uri = '/api/sns/web/v1/feed';
    const data = {
      source_note_id: noteId,
      image_formats: ['jpg', 'webp', 'avif'],
      extra: { need_body_topic: 1 },
      xsec_source: xsecSource || 'pc_search',
      xsec_token: xsecToken,
    };
    const res = await this.post(uri, data);
    if (res && res.items && res.items.length > 0) {
      return res.items[0].note_card;
    }
    logger.error(`[xhsClient.getNoteById] got empty result: ${JSON.stringify(res)}`);
    return {};
  }

  /**
   * 获取笔记的图片或视频内容 (二进制)
   */
  public async getNoteMedia(url: string): Promise<Buffer | null> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        logger.error(`[xhsClient.getNoteMedia] failed, resp: ${await resp.text()}`);
        return null;
      }
      const buf = await resp.arrayBuffer();
      return Buffer.from(buf);
    } catch (err) {
      logger.error(`[xhsClient.getNoteMedia] request error: ${err}`);
      return null;
    }
  }

  /**
   * 获取笔记评论(一级评论)
   */
  public async getNoteComments(
    noteId: string,
    xsecToken: string,
    cursor: string = ''
  ): Promise<any> {
    const uri = '/api/sns/web/v2/comment/page';
    const params = {
      note_id: noteId,
      cursor,
      top_comment_id: '',
      image_formats: 'jpg,webp,avif',
      xsec_token: xsecToken,
    };
    return this.get(uri, params);
  }

  /**
   * 获取笔记子评论(二级评论)
   */
  public async getNoteSubComments(
    noteId: string,
    rootCommentId: string,
    xsecToken: string,
    num: number = 10,
    cursor: string = ''
  ): Promise<any> {
    const uri = '/api/sns/web/v2/comment/sub/page';
    const params = {
      note_id: noteId,
      root_comment_id: rootCommentId,
      num,
      cursor,
      image_formats: 'jpg,webp,avif',
      top_comment_id: '',
      xsec_token: xsecToken,
    };
    return this.get(uri, params);
  }

  /**
   * 获取创作者信息（解析 HTML）
   */
  public async getCreatorInfo(userId: string): Promise<any> {
    const url = `${this.domain}/user/profile/${userId}`;
    const html = await this.request<string>('GET', url, {
      headers: this.headers,
      returnResponse: true,
    });
    const match = html.match(/<script>window.__INITIAL_STATE__=(.+?)<\/script>/);
    if (!match) return {};
    const rawJson = match[1].replace(':undefined', ':null');
    try {
      const info = JSON.parse(rawJson);
      return info?.user?.userPageData ?? {};
    } catch (e) {
      logger.error(`[xhsClient.getCreatorInfo] parse JSON failed: ${e}`);
      return {};
    }
  }

  /**
   * 获取某个博主的笔记列表(分页)
   */
  public async getNotesByCreator(
    userId: string,
    cursor: string,
    pageSize: number = 30
  ): Promise<any> {
    const uri = '/api/sns/web/v1/user_posted';
    const data = {
      user_id: userId,
      cursor,
      num: pageSize,
      image_formats: 'jpg,webp,avif',
    };
    logger.info('Try to getNotes by creator');
    return this.get(uri, data);
  }

  /**
   * 递归/循环获取某博主所有笔记
   */
  public async getAllNotesByCreator(
    userId: string,
    crawlInterval: number = 1.0,
    callback?: (notes: any[]) => Promise<void>
  ): Promise<any[]> {
    const result: any[] = [];
    let hasMore = true;
    let notesCursor = '';

    while (hasMore) {
      const res = await this.getNotesByCreator(userId, notesCursor);
      if (!res) {
        logger.error('[xhsClient.getAllNotesByCreator] got empty result');
        break;
      }
      hasMore = res.has_more ?? false;
      notesCursor = res.cursor ?? '';

      if (!res.notes) {
        logger.info('[xhsClient.getAllNotesByCreator] no notes found in response');
        break;
      }
      const notes = res.notes;
      logger.info(`[xhsClient.getAllNotesByCreator] got ${notes.length} notes`);

      // 回调
      if (callback) {
        await callback(notes);
      }
      // 拼接到总列表
      result.push(...notes);

      // 控制爬取速度
      await new Promise(r => setTimeout(r, crawlInterval * 1000));
    }
    return result;
  }

  /**
   * 通过抓取网页HTML获取笔记详情（如果 API 调用失败，可以再尝试这个）
   */
  public async getNoteByIdFromHtml(
    noteId: string,
    xsecSource: string,
    xsecToken: string,
    enableCookie: boolean = false
  ): Promise<any> {
    // 1. 组装URL
    const url = `${this.domain}/explore/${noteId}?xsec_token=${xsecToken}&xsec_source=${xsecSource}`;
    // 2. 如果不需要传Cookie，就去除
    const customHeaders = { ...this.headers };
    if (!enableCookie) {
      delete customHeaders['Cookie'];
    }
    // 3. 请求HTML
    const html = await this.request<string>('GET', url, {
      headers: customHeaders,
      returnResponse: true,
    });

    // 4. 解析 <script>window.__INITIAL_STATE__=...</script>
    const matchArr = html.match(/window.__INITIAL_STATE__=({.*})<\/script>/);
    if (!matchArr) return null;
    let stateStr = matchArr[1].replace(/undefined/g, '""');
    let stateJson: any;
    try {
      stateJson = JSON.parse(stateStr);
    } catch (e) {
      logger.error(`[xhsClient.getNoteByIdFromHtml] parse JSON error: ${e}`);
      return null;
    }

    if (!stateJson || !stateJson.note || !stateJson.note.noteDetailMap) {
      return null;
    }
    const noteDetail = stateJson.note.noteDetailMap[noteId]?.note;
    return noteDetail ?? null;
  }
}

// 下面这个 sign() 函数是从 Python 移植过来的示例，需要你自己实现
// export function sign(params: {
//   a1: string;
//   b1: string;
//   x_s: string;
//   x_t: string;
// }): Record<string, string> {

//   const { a1 = '', b1 = '', x_s = '', x_t = '' } = params;

//   // 对应 Python 的 common dict
//   const common = {
//     s0: 3,            // getPlatformCode
//     s1: '',           // 未知，原文是空字符串
//     x0: '1',          // localStorage.getItem("b1b1")? (猜测)
//     x1: '3.7.8-2',    // 小红书版本号(示例)
//     x2: 'Mac OS',     // 系统信息
//     x3: 'xhs-pc-web', // 平台
//     x4: '4.27.2',     // 可能也是版本
//     x5: a1,           // cookie 的 a1
//     x6: x_t,          // timestamp
//     x7: x_s,          // X-s
//     x8: b1,           // localStorage 的 b1
//     x9: mrc(x_t + x_s + b1),  // Python 里 x9 = mrc(x_t + x_s + b1)
//     x10: 154,         // getSigCount, 示例固定值
//   };

//   // 将 common 转成 JSON，再做 UTF8 编码 + Base64
//   const commonJson = JSON.stringify(common, null, 0);    // 或者用 separators=(',',':') 的方式
//   const x_s_common = encodeUtf8AndBase64(commonJson);

//   // 生成 x-b3-traceid
//   const x_b3_traceid = get_b3_trace_id();

//   return {
//     'x-s': x_s,
//     'x-t': x_t,
//     'x-s-common': x_s_common,
//     'x-b3-traceid': x_b3_traceid,
//   };
// }

function getRandomSearchId(): string {
  // 你也可以根据 Python 的 get_search_id() 搬过来
  return Math.random().toString(36).substring(2);
}
