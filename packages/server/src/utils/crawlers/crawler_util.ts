// src/utils/crawler_utils.ts

import axios from 'axios';
import { Page, Cookie } from 'playwright';
import { logger } from './logger.js';
import * as fs from 'fs';
import * as path from 'path';
import open from 'open';
import sharp from 'sharp';

/**
 * Playwright Cookie 的接口定义
 */
export interface PlaywrightCookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Lax' | 'None' | 'Strict';
}

/**
 * 查找登录二维码
 * @param page Playwright Page 对象
 * @param selector 选择器
 * @returns 二维码的 Base64 字符串或空字符串
 */
export async function findLoginQrcode(page: Page, selector: string): Promise<string> {
    try {
        const elements = await page.waitForSelector(selector, { timeout: 5000 });
        if (!elements) {
            logger.error(`[findLoginQrcode] No elements found with selector: ${selector}`);
            return '';
        }

        const login_qrcode_img = await elements.getAttribute('src');
        if (!login_qrcode_img) {
            logger.error(`[findLoginQrcode] No src attribute found for selector: ${selector}`);
            return '';
        }

        if (login_qrcode_img.startsWith('http://') || login_qrcode_img.startsWith('https://')) {
            logger.info(`[findLoginQrcode] get qrcode by url: ${login_qrcode_img}`);
            try {
                const response = await axios.get(login_qrcode_img, {
                    responseType: 'arraybuffer',
                    headers: { 'User-Agent': getUserAgent() },
                    maxRedirects: 5,
                });
                if (response.status === 200) {
                    const imageData = Buffer.from(response.data, 'binary');
                    const base64Image = imageData.toString('base64');
                    return base64Image;
                } else {
                    throw new Error(`fetch login image url failed, response status: ${response.status}`);
                }
            } catch (error) {
                logger.error(`[findLoginQrcode] Error fetching image from URL: ${login_qrcode_img}, error: ${(error as Error).message}`);
                return '';
            }
        }

        return login_qrcode_img;
    } catch (e) {
        logger.error(`[findLoginQrcode] Exception occurred: ${(e as Error).message}`);
        return '';
    }
}

/**
 * @param page Playwright Page 对象
 * @param canvasSelector Canvas 选择器
 * @returns 二维码的 Base64 字符串或空字符串
 */
export async function findQrcodeImgFromCanvas(page: Page, canvasSelector: string): Promise<string> {
    try {
        const canvas = await page.waitForSelector(canvasSelector, { timeout: 5000 });
        if (!canvas) {
            logger.error(`[findQrcodeImgFromCanvas] No canvas found with selector: ${canvasSelector}`);
            return '';
        }

        const screenshotBuffer = await canvas.screenshot();
        const base64Image = screenshotBuffer.toString('base64');
        return base64Image;
    } catch (e) {
        logger.error(`[findQrcodeImgFromCanvas] Exception occurred: ${(e as Error).message}`);
        return '';
    }
}

/**
 * 显示二维码
 * @param qrCode 二维码的 Base64 字符串
 */
export async function showQrcode(qrCode: string): Promise<void> {
    if (!qrCode) {
        logger.error('[showQrcode] No QR code provided to display.');
        return;
    }

    // 假设 qrCode 是不带 data:image/...;base64, 前缀的 base64
    const qrCodeData = qrCode.startsWith('data:') ? qrCode.split(',')[1] : qrCode;
    const buffer = Buffer.from(qrCodeData, 'base64');

    try {
        // 使用 sharp 添加白色边框
        const borderedImageBuffer = await sharp(buffer)
            .extend({
                top: 10,
                bottom: 10,
                left: 10,
                right: 10,
                background: { r: 255, g: 255, b: 255 },
            })
            .png()
            .toBuffer();

        // 写入临时文件
        const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qrcode-'));
        const tempFilePath = path.join(tempDir, 'qrcode.png');
        fs.writeFileSync(tempFilePath, borderedImageBuffer);

        // 使用默认图像查看器打开
        await open(tempFilePath);
    } catch (error) {
        logger.error(`[showQrcode] Failed to process or open QR code image: ${(error as Error).message}`);
    }
}

/**
 * 获取随机用户代理
 * @returns 用户代理字符串
 */
export function getUserAgent(): string {
    const uaList: string[] = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.79 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.53 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.5112.79 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.5060.53 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.4844.84 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5112.79 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5060.53 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.4844.84 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.5112.79 Safari/537.36'
    ];
    return uaList[Math.floor(Math.random() * uaList.length)];
}

/**
 * 获取随机移动设备用户代理
 * @returns 移动设备的用户代理字符串
 */
export function getMobileUserAgent(): string {
    const uaList: string[] = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.124 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/21.0 Chrome/110.0.5481.154 Mobile Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 OPR/99.0.0.0',
        'Mozilla/5.0 (Linux; Android 10; JNY-LX1; HMSCore 6.11.0.302) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 HuaweiBrowser/13.0.5.303 Mobile Safari/537.36'
    ];
    return uaList[Math.floor(Math.random() * uaList.length)];
}

/**
 * 转换 Playwright Cookie
 * @param cookies Playwright 获取的 Cookie 数组
 * @returns [cookie string, cookie dict]
 */
export function convertCookies(cookies: Cookie[] | null | undefined): [string, Record<string, string>] {
    // if (!cookies || cookies.length === 0) {
    //     return [{}];
    // }

    // const cookieDict: Record<string, string> = {};

    // cookies.forEach(cookie => {
    //     cookieDict[cookie.name] = cookie.value;
    // });

    // return [cookieDict];

    if (!cookies || cookies.length === 0) {
        return ["", {}];
    }

    const cookiesStr = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    const cookieDict: Record<string, string> = {};

    for (const cookie of cookies) {
        cookieDict[cookie.name] = cookie.value;
    }

    return [cookiesStr, cookieDict];
}

/**
 * 将 Cookie 字符串转换为字典
 * @param cookieStr Cookie 字符串
 * @returns Cookie 字典
 */
export function convertStrCookieToDict(cookieStr: string): Record<string, string> {
    const cookieDict: Record<string, string> = {};

    if (!cookieStr) {
        return cookieDict;
    }

    // Split cookies by ';' and process each one
    for (const cookie of cookieStr.split(';')) {
        const trimmedCookie = cookie.trim();
        if (!trimmedCookie) {
            continue;
        }

        const cookieList = trimmedCookie.split('=');
        if (cookieList.length !== 2) {
            continue;
        }

        let cookieValue = cookieList[1];

        // Ensure the value is a string (if it's an array, join it)
        if (Array.isArray(cookieValue)) {
            cookieValue = cookieValue.join('');
        }

        cookieDict[cookieList[0]] = cookieValue;
    }

    return cookieDict;
}


/**
 * 匹配交互信息数量
 * @param countStr 字符串，例如 "123 likes"
 * @returns 数量，如果未匹配到，则返回 0
 */
export function matchInteractInfoCount(countStr: string): number {
    if (!countStr) {
        return 0;
    }

    const match = countStr.match(/\d+/);
    if (match) {
        return parseInt(match[0], 10);
    } else {
        return 0;
    }
}

/**
 * 格式化代理信息为 Playwright 和 axios 可用的格式
 * @param ipProxyInfo 代理信息对象
 * @returns [Playwright Proxy, axios Proxy]
 */
export interface IPProxyInfo {
    protocol: string; // e.g., "http://", "https://"
    ip: string;
    port: number;
    user?: string;
    password?: string;
}

export interface PlaywrightProxy {
    server: string;
    username?: string;
    password?: string;
}

export interface AxiosProxy {
    protocol: string;
    host: string;
    port: number;
    auth?: {
        username: string;
        password: string;
    };
}

export function formatProxyInfo(ipProxyInfo: IPProxyInfo): [PlaywrightProxy | null, AxiosProxy | null] {
    if (!ipProxyInfo.protocol || !ipProxyInfo.ip || !ipProxyInfo.port) {
        return [null, null];
    }

    // Playwright proxy
    const playwrightProxy: PlaywrightProxy = {
        server: `${ipProxyInfo.protocol}${ipProxyInfo.ip}:${ipProxyInfo.port}`,
    };

    if (ipProxyInfo.user && ipProxyInfo.password) {
        playwrightProxy.username = ipProxyInfo.user;
        playwrightProxy.password = ipProxyInfo.password;
    }

    // axios proxy
    let axiosProxy: AxiosProxy | null = null;
    if (ipProxyInfo.user && ipProxyInfo.password) {
        axiosProxy = {
            protocol: ipProxyInfo.protocol.replace('://', ''),
            host: ipProxyInfo.ip,
            port: ipProxyInfo.port,
            auth: {
                username: ipProxyInfo.user,
                password: ipProxyInfo.password,
            }
        };
    } else {
        axiosProxy = {
            protocol: ipProxyInfo.protocol.replace('://', ''),
            host: ipProxyInfo.ip,
            port: ipProxyInfo.port,
        };
    }

    return [playwrightProxy, axiosProxy];
}

/**
 * 从 HTML 中提取文本，移除所有标签
 * @param html HTML 字符串
 * @returns 提取的纯文本
 */
export function extractTextFromHtml(html: string): string {
    if (!html) {
        return '';
    }

    // Remove script and style elements
    let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove all other tags
    const cleanText = cleanHtml.replace(/<[^>]+>/g, '').trim();

    return cleanText;
}

/**
 * 从 URL 中提取参数并转换为字典
 * @param url URL 字符串
 * @returns 参数字典
 */
export function extractUrlParamsToDict(url: string): Record<string, string> {
    const urlParamsDict: Record<string, string> = {};

    if (!url) {
        return urlParamsDict;
    }

    try {
        const parsedUrl = new URL(url);
        const params = parsedUrl.searchParams;
        params.forEach((value, key) => {
            urlParamsDict[key] = value;
        });
    } catch (e) {
        logger.error(`[extractUrlParamsToDict] Invalid URL: ${url}, error: ${(e as Error).message}`);
    }

    return urlParamsDict;
}


