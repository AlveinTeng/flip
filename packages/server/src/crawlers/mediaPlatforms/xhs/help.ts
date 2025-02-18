// src/crawlers/mediaPlatforms/xiaohongshu/help.ts


import { NoteUrlInfo } from './field.js';
import { extractUrlParamsToDict } from '../../../utils/crawlers/crawler_util.js';

/**
 * CRC32 Lookup Table
 */
const CRC32_TABLE: number[] = [
    0, 1996959894, 3993919788, 2567524794, /* ... (rest of the CRC table) ... */ 1510334235, 755167117,
];

/**
 * Base64 Lookup Table
 */
const BASE64_LOOKUP: string[] = [
    'Z', 'm', 's', 'e', 'r', 'b', 'B', 'o', 'H', 'Q', 't', 'N', 'P', '+', 'w', 'O',
    'c', 'z', 'a', '/', 'L', 'p', 'n', 'g', 'G', '8', 'y', 'J', 'q', '4', '2',
    'K', 'W', 'Y', 'j', '0', 'D', 'S', 'f', 'd', 'i', 'k', 'x', '3', 'V', 'T',
    '1', '6', 'I', 'l', 'U', 'A', 'F', 'M', '9', '7', 'h', 'E', 'C', 'v', 'u',
    'R', 'X', '5',
];

/**
 * Generates a signature object.
 * @param a1 - cookie of a1
 * @param b1 - localStorage.getItem("b1")
 * @param x_s - x_s 参数
 * @param x_t - x_t 参数
 * @returns 签名对象
 */
export function sign(a1: string = '', b1: string = '', x_s: string = '', x_t: string = ''): Record<string, string> {
    const common: Record<string, any> = {
        s0: 3,  // getPlatformCode
        s1: '',
        x0: '1',  // localStorage.getItem("b1b1")
        x1: '3.7.8-2',  // version
        x2: 'Mac OS',
        x3: 'xhs-pc-web',
        x4: '4.27.2',
        x5: a1,  // cookie of a1
        x6: x_t,
        x7: x_s,
        x8: b1,  // localStorage.getItem("b1")
        x9: mrc(x_t + x_s + b1),
        x10: 154,  // getSigCount
    };

    const encodeStr = encodeUtf8(JSON.stringify(common));
    const x_s_common = b64Encode(encodeStr);
    const x_b3_traceid = get_b3_trace_id();

    return {
        'x-s': x_s,
        'x-t': x_t,
        'x-s-common': x_s_common,
        'x-b3-traceid': x_b3_traceid
    };
}

/**
 * Generates a random b3_trace_id.
 * @returns 随机生成的 b3_trace_id
 */
export function get_b3_trace_id(): string {
    const chars = 'abcdef0123456789';
    let traceId = '';
    for (let i = 0; i < 16; i++) {
        traceId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return traceId;
}

/**
 * Computes the CRC32 checksum of a string.
 * @param input - Input string
 * @returns CRC32 checksum
 */
export function mrc(input: string): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < input.length; i++) {
        const byte = input.charCodeAt(i);
        crc = (CRC32_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8)) >>> 0;
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Encodes an array of numbers to a Base64 string using a custom lookup table.
 * @param bytes - Array of numbers (bytes)
 * @returns Base64 encoded string
 */
export function b64Encode(bytes: number[]): string {
    let encoded = '';
    const len = bytes.length;
    const remainder = len % 3;

    for (let i = 0; i < len - remainder; i += 3) {
        const n = (bytes[i] << 16) + (bytes[i + 1] << 8) + bytes[i + 2];
        encoded += tripletToBase64(n);
    }

    if (remainder === 1) {
        const n = bytes[len - 1] << 16;
        encoded += `${BASE64_LOOKUP[(n >> 18) & 63]}${BASE64_LOOKUP[(n >> 12) & 63]}==`;
    } else if (remainder === 2) {
        const n = (bytes[len - 2] << 16) + (bytes[len - 1] << 8);
        encoded += `${BASE64_LOOKUP[(n >> 18) & 63]}${BASE64_LOOKUP[(n >> 12) & 63]}${BASE64_LOOKUP[(n >> 6) & 63]}=`;
    }

    return encoded;
}

/**
 * Encodes a number into a Base64 string using the custom lookup table.
 * @param num - Number to encode
 * @returns Base64 string
 */
function tripletToBase64(num: number): string {
    return (
        BASE64_LOOKUP[(num >> 18) & 63] +
        BASE64_LOOKUP[(num >> 12) & 63] +
        BASE64_LOOKUP[(num >> 6) & 63] +
        BASE64_LOOKUP[num & 63]
    );
}

/**
 * Encodes a string into a UTF-8 byte array.
 * @param str - Input string
 * @returns Array of UTF-8 bytes
 */
export function encodeUtf8(str: string): number[] {
    const utf8: number[] = [];
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        if (charCode < 0x80) {
            utf8.push(charCode);
        } else if (charCode < 0x800) {
            utf8.push(0xc0 | (charCode >> 6));
            utf8.push(0x80 | (charCode & 0x3f));
        } else if (charCode < 0xd800 || charCode >= 0xe000) {
            utf8.push(0xe0 | (charCode >> 12));
            utf8.push(0x80 | ((charCode >> 6) & 0x3f));
            utf8.push(0x80 | (charCode & 0x3f));
        } else {
            // Surrogate pair
            i++;
            // UTF-16 encodes 0x10000-0x10FFFF by subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            const surrogatePair = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (surrogatePair >> 18));
            utf8.push(0x80 | ((surrogatePair >> 12) & 0x3f));
            utf8.push(0x80 | ((surrogatePair >> 6) & 0x3f));
            utf8.push(0x80 | (surrogatePair & 0x3f));
        }
    }
    return utf8;
}

/**
 * Encodes a number into a Base36 string.
 * @param number - Input number
 * @param alphabet - Alphabet for encoding
 * @returns Base36 encoded string
 */
export function base36encode(
    number: number,
    alphabet: string = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
): string {
    if (!Number.isInteger(number)) {
        throw new TypeError('number must be an integer');
    }

    let base36 = '';
    let sign = '';

    if (number < 0) {
        sign = '-';
        number = -number;
    }

    if (number < alphabet.length) {
        return sign + alphabet[number];
    }

    while (number !== 0) {
        const { quotient, remainder } = divmod(number, alphabet.length);
        base36 = alphabet[remainder] + base36;
        number = quotient;
    }

    return sign + base36;
}

/**
 * Decodes a Base36 string into a number.
 * @param str - Base36 encoded string
 * @returns Decoded number
 */
export function base36decode(str: string): number {
    return parseInt(str, 36);
}

/**
 * Returns the quotient and remainder of a division.
 * @param dividend - Dividend
 * @param divisor - Divisor
 * @returns Object containing quotient and remainder
 */
function divmod(
    dividend: number,
    divisor: number
): { quotient: number; remainder: number } {
    const quotient = Math.floor(dividend / divisor);
    const remainder = dividend % divisor;
    return { quotient, remainder };
}

/**
 * Generates a search ID.
 * @returns 搜索 ID
 */
export function get_search_id(): string {
    // Since JavaScript numbers are IEEE-754 doubles and bitwise operations are 32-bit,
    // we use BigInt to handle larger bit shifts.
    const timestamp = BigInt(Math.floor(Date.now() * 1000));
    const randomPart = BigInt(Math.floor(Math.random() * 2147483646));
    const combined = (timestamp << BigInt(32)) + randomPart; // Shift by 32 instead of 64
    return base36encode(Number(combined));
}

/**
 * Array of image CDNs.
 */
const img_cdns: string[] = [
    'https://sns-img-qc.xhscdn.com',
    'https://sns-img-hw.xhscdn.com',
    'https://sns-img-bd.xhscdn.com',
    'https://sns-img-qn.xhscdn.com',
];

/**
 * Generates a single image URL based on trace_id.
 * @param trace_id - Trace ID
 * @param format_type - Image format
 * @returns Image URL
 */
export function get_img_url_by_trace_id(
    trace_id: string,
    format_type: string = 'png'
): string {
    const cdn = img_cdns[Math.floor(Math.random() * img_cdns.length)];
    return `${cdn}/${trace_id}?imageView2/format/${format_type}`;
}

/**
 * Generates multiple image URLs based on trace_id.
 * @param trace_id - Trace ID
 * @param format_type - Image format
 * @returns Array of Image URLs
 */
export function get_img_urls_by_trace_id(
    trace_id: string,
    format_type: string = 'png'
): string[] {
    return img_cdns.map(
        (cdn) => `${cdn}/${trace_id}?imageView2/format/${format_type}`
    );
}

/**
 * Extracts trace_id from an image URL.
 * @param img_url - Image URL
 * @returns Trace ID
 */
export function get_trace_id(img_url: string): string {
    // Handles URLs with and without '/spectrum/'
    const parts = img_url.split('/');
    const lastPart = parts.pop() || '';
    return img_url.includes('spectrum') ? `spectrum/${lastPart}` : lastPart;
}

/**
 * Parses note information from a Xiaohongshu note URL.
 * @param url - Note URL
 * @returns NoteUrlInfo object
 */
export function parse_note_info_from_note_url(url: string): NoteUrlInfo {
    /**
     * Example URL:
     * "https://www.xiaohongshu.com/explore/66fad51c000000001b0224b8?xsec_token=AB3rO-QopW5sgrJ41GwN01WCXh6yWPxjSoFI9D5JIMgKw=&xsec_source=pc_search"
     */
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/');
    const note_id = pathSegments[pathSegments.length - 1];
    const params = extractUrlParamsToDict(url);
    const xsec_token = params['xsec_token'] || '';
    const xsec_source = params['xsec_source'] || '';
    return { note_id, xsec_token, xsec_source };
}

