// src/crawlers/mediaPlatforms/xiaohongshu/login.ts
import pRetry from 'p-retry';
import { BrowserContext, Page, Locator } from 'playwright';
import { BaseLogin } from '../../base/baseLogin.js';
import { 
    findLoginQrcode, 
    showQrcode, 
    convertCookies, 
    convertStrCookieToDict 
} from '../../../utils/crawlers/crawler_util.js';
import { logger } from '../../../utils/crawlers/logger.js';
import RetryError from 'p-retry'; // 用于捕获重试错误

// 假设你有一个 CacheFactory 和 CacheClient 的实现
// import { CacheFactory, CacheClient } from '../../../utils/cache/cache_factory'; // 根据实际路径调整

export class xhsLogin implements BaseLogin {
    private xiaohongshuLoginUrl = 'https://www.xiaohongshu.com/login'; // 根据实际登录URL调整

    constructor(
        private loginType: 'qrcode' | 'phone' | 'cookie',
        private browserContext: BrowserContext,
        private contextPage: Page,
        private loginPhone: string = '',
        private cookieStr: string = ''
    ) {}

    public async begin(): Promise<void> {
        logger.info('[XiaoHongShuLogin.begin] Begin login XiaoHongShu ...');

        switch (this.loginType) {
            case 'qrcode':
                await this.loginByQrcode();
                break;
            case 'phone':
                await this.loginByMobile();
                break;
            case 'cookie':
                await this.loginByCookies();
                break;
            default:
                throw new Error('[XiaoHongShuLogin.begin] Invalid Login Type. Currently only supported qrcode, phone, cookie.');
        }
    }

    private async checkLoginState(noLoggedInSession?: string): Promise<boolean> {
        const currentCookies = await this.browserContext.cookies();
        const [cookieStr, cookieDict] = convertCookies(currentCookies);

        if ('web_session' in cookieDict && cookieDict['web_session'] !== noLoggedInSession) {
            return true;
        }

        const pageContent = await this.contextPage.content();
        if (pageContent.includes('请通过验证')) {
            logger.info('[XiaoHongShuLogin.check_login_state] 登录过程中出现验证码，请手动验证');
        }

        return false;
    }

    private async waitForLoginSuccess(noLoggedInSession?: string): Promise<void> {
        await pRetry(async () => {
            const loggedIn = await this.checkLoginState(noLoggedInSession);
            if (!loggedIn) {
                throw new Error('XiaoHongShuLogin checkLoginState => not yet logged in');
            }
        }, {
            retries: 600,              // 最大重试次数
            factor: 1,                 // 重试因子
            minTimeout: 1000,          // 最小重试间隔（毫秒）
            maxTimeout: 1000,          // 最大重试间隔（毫秒）
            onFailedAttempt: error => {
                logger.info(`[XiaoHongShuLogin.waitForLoginSuccess] Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
            }
        });
    }

    public async loginByQrcode(): Promise<void> {
        logger.info('[XiaoHongShuLogin.login_by_qrcode] Begin login XiaoHongShu by qrcode ...');
        await this.contextPage.goto(this.xiaohongshuLoginUrl);

        const qrcodeImgSelector = "xpath=//img[@class='qrcode-img']"; // 根据实际情况调整选择器
        let base64QrcodeImg = await findLoginQrcode(this.contextPage, qrcodeImgSelector);

        if (!base64QrcodeImg) {
            logger.info('[XiaoHongShuLogin.login_by_qrcode] login failed, have not found qrcode please check ....');
            // 如果网站没有自动弹出登录对话框，手动点击登录按钮
            await this.contextPage.click("xpath=//*[@id='app']/div[1]/div[2]/div[1]/ul/div[1]/button");
            base64QrcodeImg = await findLoginQrcode(this.contextPage, qrcodeImgSelector);
            if (!base64QrcodeImg) {
                logger.error('[XiaoHongShuLogin.login_by_qrcode] QR code not found after clicking login button. Exiting...');
                process.exit(1);
            }
        }

        // 获取未登录状态的 session
        const currentCookies = await this.browserContext.cookies();
        const [cookieStr, cookieDict] = convertCookies(currentCookies);
        const noLoggedInSession = cookieDict['web_session'];

        // 显示登录二维码
        showQrcode(base64QrcodeImg).catch(error => {
            logger.error(`[XiaoHongShuLogin.login_by_qrcode] Failed to show QR code: ${error}`);
        });

        logger.info('[XiaoHongShuLogin.login_by_qrcode] Waiting for scan code login, remaining time is 120s');

        try {
            await this.waitForLoginSuccess(noLoggedInSession);
        } catch (error) {
            if (error instanceof RetryError) {
                logger.error('[XiaoHongShuLogin.login_by_qrcode] Login XiaoHongShu failed by qrcode login method ...');
                process.exit(1);
            } else {
                logger.error(`[XiaoHongShuLogin.login_by_qrcode] Unexpected error during login:${error}`);
                process.exit(1);
            }
        }

        const waitRedirectSeconds = 5;
        logger.info(`[XiaoHongShuLogin.login_by_qrcode] Login successful, waiting ${waitRedirectSeconds}s for redirect...`);
        await new Promise(resolve => setTimeout(resolve, waitRedirectSeconds * 1000));
    }

    public async loginByMobile(): Promise<void> {
        //TODO
        logger.info('[XiaoHongShuLogin.login_by_mobile]: Not implemented');
        // logger.info("[XiaoHongShuLogin.login_by_mobile] Begin login XiaoHongShu by mobile ...");
        // await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒

        // try {
        //     // 有可能不会自动弹出登录框，需要手动点击登录按钮
        //     const loginButtonSelector = "xpath=//*[@id='app']/div[1]/div[2]/div[1]/ul/div[1]/button";
        //     const loginButtonEle = await this.contextPage.waitForSelector(loginButtonSelector, { timeout: 5000 });
        //     await loginButtonEle.click();

        //     // 切换到手机登录
        //     const mobileLoginSelector = 'xpath=//div[@class="login-container"]//div[@class="other-method"]/div[1]';
        //     const mobileLoginEle = await this.contextPage.waitForSelector(mobileLoginSelector, { timeout: 5000 });
        //     await mobileLoginEle.click();
        // } catch (error) {
        //     logger.info("[XiaoHongShuLogin.login_by_mobile] Have not found mobile button icon and keep going ...");
        // }

        // await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒

        // // 填写手机号
        // const loginContainerSelector = "div.login-container";
        // const loginContainerEle = await this.contextPage.waitForSelector(loginContainerSelector);
        // const phoneInputSelector = "label.phone > input";
        // const phoneInputEle = await loginContainerEle.$(phoneInputSelector);
        // if (phoneInputEle) {
        //     await phoneInputEle.fill(this.loginPhone);
        //     await new Promise(resolve => setTimeout(resolve, 500)); // 等待0.5秒
        // } else {
        //     logger.error("[XiaoHongShuLogin.login_by_mobile] Phone input element not found.");
        //     process.exit(1);
        // }

        // // 点击发送验证码
        // const sendBtnSelector = "label.auth-code > span";
        // const sendBtnEle = await loginContainerEle.$(sendBtnSelector);
        // if (sendBtnEle) {
        //     await sendBtnEle.click();
        // } else {
        //     logger.error("[XiaoHongShuLogin.login_by_mobile] Send button element not found.");
        //     process.exit(1);
        // }

        // // 等待并填写短信验证码
        // const smsCodeInputSelector = "label.auth-code > input";
        // const submitBtnSelector = "div.input-container > button";
        // const smsCodeInputEle = await loginContainerEle.$(smsCodeInputSelector);
        // const submitBtnEle = await loginContainerEle.$(submitBtnSelector);

        // if (!smsCodeInputEle || !submitBtnEle) {
        //     logger.error("[XiaoHongShuLogin.login_by_mobile] SMS code input or submit button not found.");
        //     process.exit(1);
        // }

        // // 初始化缓存客户端
        // const cacheClient: CacheClient = CacheFactory.createCache('memory'); // 根据实际类型调整
        // let maxGetSmsCodeTime = 60 * 2; // 最长获取验证码的时间为2分钟
        // let noLoggedInSession = "";

        // while (maxGetSmsCodeTime > 0) {
        //     logger.info(`[XiaoHongShuLogin.login_by_mobile] Get SMS code from cache, remaining time ${maxGetSmsCodeTime}s ...`);
        //     await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒

        //     const smsCodeKey = `xhs_${this.loginPhone}`;
        //     const smsCodeValue = cacheClient.get(smsCodeKey);
        //     if (!smsCodeValue) {
        //         maxGetSmsCodeTime -= 1;
        //         continue;
        //     }

        //     // 获取当前 session
        //     const currentCookies = await this.browserContext.cookies();
        //     const [cookieDict] = convertCookies(currentCookies);
        //     noLoggedInSession = cookieDict['web_session'];

        //     // 填写短信验证码
        //     await smsCodeInputEle.fill(smsCodeValue.toString());
        //     await new Promise(resolve => setTimeout(resolve, 500)); // 等待0.5秒

        //     // 点击同意隐私协议
        //     const agreePrivacySelector = "xpath=//div[@class='agreements']//*[local-name()='svg']";
        //     const agreePrivacyEle = this.contextPage.locator(agreePrivacySelector);
        //     await agreePrivacyEle.click();
        //     await new Promise(resolve => setTimeout(resolve, 500)); // 等待0.5秒

        //     // 点击提交登录
        //     await submitBtnEle.click();

        //     // TODO: 需要检查验证码的正确性，有可能输入的验证码不正确

        //     break;
        // }

        // try {
        //     await this.checkLoginState(noLoggedInSession);
        // } catch (error) {
        //     if (error instanceof pRetry.AbortError || error instanceof RetryError) {
        //         logger.info("[XiaoHongShuLogin.login_by_mobile] Login XiaoHongShu failed by mobile login method ...");
        //         process.exit(1);
        //     } else {
        //         logger.error("[XiaoHongShuLogin.login_by_mobile] Unexpected error during login:", error);
        //         process.exit(1);
        //     }
        // }

        // const waitRedirectSeconds = 5;
        // logger.info(`[XiaoHongShuLogin.login_by_mobile] Login successful, waiting ${waitRedirectSeconds}s for redirect ...`);
        // await new Promise(resolve => setTimeout(resolve, waitRedirectSeconds * 1000));
    }

    public async loginByCookies(): Promise<void> {
        logger.info("[XiaoHongShuLogin.loginByCookies] Begin login xiaohongshu by cookie ...");

        // Convert the cookie string to a dictionary
        const cookieDict = convertStrCookieToDict(this.cookieStr);

        for (const [key, value] of Object.entries(cookieDict)) {
            // Only set the "web_session" cookie attribute
            if (key !== "web_session") {
                continue;
            }

            // Add the web_session cookie to the browser context
            await this.browserContext.addCookies([{
                name: key,
                value: value as string,
                domain: ".xiaohongshu.com",
                path: "/"
            }]);
        }
    }
}
