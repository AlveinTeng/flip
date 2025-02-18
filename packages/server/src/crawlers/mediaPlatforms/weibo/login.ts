import pRetry from 'p-retry';
import { BrowserContext, Page } from 'playwright';
import { BaseLogin } from '../../base/baseLogin.js';
import { 
    findLoginQrcode, 
    showQrcode, 
    convertCookies, 
    convertStrCookieToDict 
} from '../../../utils/crawlers/crawler_util.js';
import { logger } from '../../../utils/crawlers/logger.js';

export class WeiboLogin implements BaseLogin {
    private weiboSsoLoginUrl = 'https://passport.weibo.com/sso/signin?entry=miniblog&source=miniblog';

    constructor(
        private loginType: 'qrcode' | 'phone' | 'cookie',  
        private browserContext: BrowserContext,         
        private contextPage: Page,                     
        private loginPhone: string = '',                
        private cookieStr: string = ''                  
    ) {
    }

    public async begin(): Promise<void> {
        logger.info('[WeiboLogin.begin] Begin login weibo ...');

        if (this.loginType === 'qrcode') {
            await this.loginByQrcode();
        } else if (this.loginType === 'phone') {
            await this.loginByMobile();
        } else if (this.loginType === 'cookie') {
            await this.loginByCookies();
        } else {
            throw new Error(
                '[WeiboLogin.begin] Invalid Login Type. Currently only supported qrcode, phone, cookie.'
            );
        }
    }

    private async checkLoginState(noLoggedInSession?: string): Promise<boolean> {
        const currentCookie = await this.browserContext.cookies();
        const [cookieStr, cookieDict]: [string, { [key: string]: string }] = convertCookies(currentCookie);

        if (cookieDict['SSOLoginState']) {
            return true;
        }

        const currentWebSession = cookieDict['WBPSESS'];
        if (currentWebSession && currentWebSession !== noLoggedInSession) {
            return true;
        }

        return false;
    }

    private async waitForLoginSuccess(noLoggedInSession?: string): Promise<void> {
        await pRetry(async () => {
            const loggedIn = await this.checkLoginState(noLoggedInSession);
            if (!loggedIn) {
                throw new Error('WeiboLogin checkLoginState => not yet logged in');
            }
        }, {
            retries: 600,              
            factor: 1,                 
            minTimeout: 1000,          
            maxTimeout: 1000,          
        });
    }

    public async loginByQrcode(): Promise<void> {
        logger.info('[WeiboLogin.login_by_qrcode] Begin login weibo by qrcode ...');
        await this.contextPage.goto(this.weiboSsoLoginUrl);

        const qrcodeImgSelector = "xpath=//img[@class='w-full h-full']";
        const base64QrcodeImg = await findLoginQrcode(this.contextPage, qrcodeImgSelector);

        if (!base64QrcodeImg) {
            logger.info(
                '[WeiboLogin.login_by_qrcode] login failed, have not found qrcode. Please check ....'
            );
            process.exit(1);
        }

        await showQrcode(base64QrcodeImg);
        logger.info('[WeiboLogin.login_by_qrcode] Waiting for scan code login...');

        const currentCookie = await this.browserContext.cookies();
        const [coonkieStr, cookieDict] = convertCookies(currentCookie);
        const noLoggedInSession = cookieDict['WBPSESS'];

        try {
            await this.waitForLoginSuccess(noLoggedInSession);
        } catch (error) {
            logger.info('[WeiboLogin.login_by_qrcode] Login weibo failed by QRCode method...');
            process.exit(1);
        }

        const waitRedirectSeconds = 5;
        logger.info(
            `[WeiboLogin.login_by_qrcode] Login successful, waiting ${waitRedirectSeconds}s for redirect...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitRedirectSeconds * 1000));
    }

    public async loginByMobile(): Promise<void> {
        //TODO
        logger.info('[WeiboLogin.login_by_mobile] Not implemented yet ...');
    }

    public async loginByCookies(): Promise<void> {
        logger.info('[WeiboLogin.login_by_cookies] Begin login weibo by cookie ...');

        const cookieDict = convertStrCookieToDict(this.cookieStr);
        const cookiesToAdd = Object.entries(cookieDict).map(([key, value]) => {
            return {
                name: key,
                value: value,
                domain: '.weibo.cn',
                path: '/',
            };
        });
        await this.browserContext.addCookies(cookiesToAdd);
        logger.info('[WeiboLogin.login_by_cookies] Cookies set successfully.');
    }
    // public async loginByCookies(): Promise<void> {
    //     logger.info('[WeiboLogin.login_by_cookies] Begin login weibo by cookie ...');
    
    //     if (!this.cookieStr || this.cookieStr.trim().length === 0) {
    //         // 如果 cookieStr 为空，则不设置 Cookie，直接返回
    //         logger.info('[WeiboLogin.login_by_cookies] No cookies provided, skipping cookie login to test guest mode.');
    //         return;
    //     }
    
    //     // 转换 Cookie 字符串为字典
    //     const cookieDict = convertStrCookieToDict(this.cookieStr);
    //     const cookiesToAdd = Object.entries(cookieDict).map(([key, value]) => {
    //         return {
    //             name: key,
    //             value: value,
    //             domain: '.weibo.cn',
    //             path: '/',
    //         };
    //     });
    
    //     // 将 Cookie 添加到浏览器上下文
    //     await this.browserContext.addCookies(cookiesToAdd);
    //     logger.info('[WeiboLogin.login_by_cookies] Cookies set successfully.');
    // }
    
}
