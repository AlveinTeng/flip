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
export function sign(a1: string = "", b1: string = "", x_s: string = "", x_t: string = ""): { [key: string]: string } {
    const common = {
        s0: 3,  // getPlatformCode
        s1: "",
        x0: "1",  // localStorage.getItem("b1b1")
        x1: "3.7.8-2",  // version
        x2: "Mac OS",
        x3: "xhs-pc-web",
        x4: "4.27.2",
        x5: a1,  // cookie of a1
        x6: x_t,
        x7: x_s,
        x8: b1,  // localStorage.getItem("b1")
        x9: mrc(x_t + x_s + b1),
        x10: 154,  // getSigCount
    };

    const encodeStr = encodeUtf8(JSON.stringify(common, null, ':,'));
    const x_s_common = b64Encode(encodeStr);
    const x_b3_traceid = get_b3_trace_id();

    return {
        "x-s": x_s,
        "x-t": x_t,
        "x-s-common": x_s_common,
        "x-b3-traceid": x_b3_traceid,
    };
}

/**
 * Generates a random b3_trace_id.
 * @returns 随机生成的 b3_trace_id
 */
export function get_b3_trace_id(): string {
    const re = "abcdef0123456789";
    const je = 16;
    let e = "";
    for (let t = 0; t < 16; t++) {
        const randomIndex = Math.floor(Math.random() * je);
        e += re[randomIndex];
    }
    return e;
}

/**
 * Computes the CRC32 checksum of a string.
 * @param input - Input string
 * @returns CRC32 checksum
 */
const ie = [
    0, 1996959894, 3993919788, 2567524794, 124634137, 1886057615, 3915621685,
    2657392035, 249268274, 2044508324, 3772115230, 2547177864, 162941995,
    2125561021, 3887607047, 2428444049, 498536548, 1789927666, 4089016648,
    2227061214, 450548861, 1843258603, 4107580753, 2211677639, 325883990,
    1684777152, 4251122042, 2321926636, 335633487, 1661365465, 4195302755,
    2366115317, 997073096, 1281953886, 3579855332, 2724688242, 1006888145,
    1258607687, 3524101629, 2768942443, 901097722, 1119000684, 3686517206,
    2898065728, 853044451, 1172266101, 3705015759, 2882616665, 651767980,
    1373503546, 3369554304, 3218104598, 565507253, 1454621731, 3485111705,
    3099436303, 671266974, 1594198024, 3322730930, 2970347812, 795835527,
    1483230225, 3244367275, 3060149565, 1994146192, 31158534, 2563907772,
    4023717930, 1907459465, 112637215, 2680153253, 3904427059, 2013776290,
    251722036, 2517215374, 3775830040, 2137656763, 141376813, 2439277719,
    3865271297, 1802195444, 476864866, 2238001368, 4066508878, 1812370925,
    453092731, 2181625025, 4111451223, 1706088902, 314042704, 2344532202,
    4240017532, 1658658271, 366619977, 2362670323, 4224994405, 1303535960,
    984961486, 2747007092, 3569037538, 1256170817, 1037604311, 2765210733,
    3554079995, 1131014506, 879679996, 2909243462, 3663771856, 1141124467,
    855842277, 2852801631, 3708648649, 1342533948, 654459306, 3188396048,
    3373015174, 1466479909, 544179635, 3110523913, 3462522015, 1591671054,
    702138776, 2966460450, 3352799412, 1504918807, 783551873, 3082640443,
    3233442989, 3988292384, 2596254646, 62317068, 1957810842, 3939845945,
    2647816111, 81470997, 1943803523, 3814918930, 2489596804, 225274430,
    2053790376, 3826175755, 2466906013, 167816743, 2097651377, 4027552580,
    2265490386, 503444072, 1762050814, 4150417245, 2154129355, 426522225,
    1852507879, 4275313526, 2312317920, 282753626, 1742555852, 4189708143,
    2394877945, 397917763, 1622183637, 3604390888, 2714866558, 953729732,
    1340076626, 3518719985, 2797360999, 1068828381, 1219638859, 3624741850,
    2936675148, 906185462, 1090812512, 3747672003, 2825379669, 829329135,
    1181335161, 3412177804, 3160834842, 628085408, 1382605366, 3423369109,
    3138078467, 570562233, 1426400815, 3317316542, 2998733608, 733239954,
    1555261956, 3268935591, 3050360625, 752459403, 1541320221, 2607071920,
    3965973030, 1969922972, 40735498, 2617837225, 3943577151, 1913087877,
    83908371, 2512341634, 3803740692, 2075208622, 213261112, 2463272603,
    3855990285, 2094854071, 198958881, 2262029012, 4057260610, 1759359992,
    534414190, 2176718541, 4139329115, 1873836001, 414664567, 2282248934,
    4279200368, 1711684554, 285281116, 2405801727, 4167216745, 1634467795,
    376229701, 2685067896, 3608007406, 1308918612, 956543938, 2808555105,
    3495958263, 1231636301, 1047427035, 2932959818, 3654703836, 1088359270,
    936918000, 2847714899, 3736837829, 1202900863, 817233897, 3183342108,
    3401237130, 1404277552, 615818150, 3134207493, 3453421203, 1423857449,
    601450431, 3009837614, 3294710456, 1567103746, 711928724, 3020668471,
    3272380065, 1510334235, 755167117,
];

function rightWithoutSign(num: number, bit: number = 0): number {
    const MAX32INT = 4294967295;
    return ((num >>> bit) + (MAX32INT + 1)) % (2 * (MAX32INT + 1)) - MAX32INT - 1;
}

function mrc(e: string): number {
    let o = -1;
    
    for (let n = 0; n < 57; n++) {
        o = ie[(o & 255) ^ e.charCodeAt(n)] ^ rightWithoutSign(o, 8);
    }
    
    return o ^ -1 ^ 3988292384;
}

/**
 * Encodes an array of numbers to a Base64 string using a custom lookup table.
 * @param bytes - Array of numbers (bytes)
 * @returns Base64 encoded string
 */
const lookup = [
    "Z", "m", "s", "e", "r", "b", "B", "o", "H", "Q", "t", "N", "P", "+", "w", "O",
    "c", "z", "a", "/", "L", "p", "n", "g", "G", "8", "y", "J", "q", "4", "2", "K", "W",
    "Y", "j", "0", "D", "S", "f", "d", "i", "k", "x", "3", "V", "T", "1", "6", "I", "l",
    "U", "A", "F", "M", "9", "7", "h", "E", "C", "v", "u", "R", "X", "5"
];

function tripletToBase64(e: number): string {
    return (
        lookup[63 & (e >> 18)] +
        lookup[63 & (e >> 12)] +
        lookup[(e >> 6) & 63] +
        lookup[e & 63]
    );
}

function encodeChunk(e: number[], t: number, r: number): string {
    const m: string[] = [];
    for (let b = t; b < r; b += 3) {
        const n = (16711680 & (e[b] << 16)) + 
                  ((e[b + 1] << 8) & 65280) + 
                  (e[b + 2] & 255);
        m.push(tripletToBase64(n));
    }
    return m.join('');
}

export function b64Encode(e: number[]): string {
    const P = e.length;
    const W = P % 3;
    const U: string[] = [];
    const z = 16383;
    let H = 0;
    const Z = P - W;

    while (H < Z) {
        U.push(encodeChunk(e, H, Math.min(Z, H + z)));
        H += z;
    }

    if (W === 1) {
        const F = e[P - 1];
        U.push(lookup[F >> 2] + lookup[(F << 4) & 63] + "==");
    } else if (W === 2) {
        const F = (e[P - 2] << 8) + e[P - 1];
        U.push(lookup[F >> 10] + lookup[(63 & F) >> 4] + lookup[(F << 2) & 63] + "=");
    }

    return U.join("");
}



/**
 * Encodes a string into a UTF-8 byte array.
 * @param str - Input string
 * @returns Array of UTF-8 bytes
 */
export function encodeUtf8(e: string): number[] {
    const b: number[] = [];
    const m = encodeURIComponent(e); // Equivalent to urllib.parse.quote in Python
    let w = 0;

    while (w < m.length) {
        const T = m[w];
        if (T === "%") {
            const E = m[w + 1] + m[w + 2];
            const S = parseInt(E, 16);
            b.push(S);
            w += 2;
        } else {
            b.push(T.charCodeAt(0));
        }
        w += 1;
    }

    return b;
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

