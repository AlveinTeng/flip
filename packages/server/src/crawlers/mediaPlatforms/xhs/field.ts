// src/crawlers/mediaPlatforms/xiaohongshu/field.ts


export enum FeedType {
    // 推荐
    RECOMMEND = "homefeed_recommend",
    // 穿搭
    FASHION = "homefeed.fashion_v3",
    // 美食
    FOOD = "homefeed.food_v3",
    // 彩妆
    COSMETICS = "homefeed.cosmetics_v3",
    // 影视
    MOVIE = "homefeed.movie_and_tv_v3",
    // 职场
    CAREER = "homefeed.career_v3",
    // 情感
    EMOTION = "homefeed.love_v3",
    // 家居
    HOUSEHOLD = "homefeed.household_product_v3",
    // 游戏
    GAME = "homefeed.gaming_v3",
    // 旅行
    TRAVEL = "homefeed.travel_v3",
    // 健身
    FITNESS = "homefeed.fitness_v3"
}


/**
 * NoteType 枚举
 * 代表笔记的类型
 */
export enum NoteType {
    NORMAL = "normal",
    VIDEO = "video"
}

/**
 * SearchSortType 枚举
 * 搜索排序类型
 */
export enum SearchSortType {
    /** 默认排序 */
    GENERAL = "general",
    /** 最受欢迎 */
    MOST_POPULAR = "popularity_descending",
    /** 最新 */
    LATEST = "time_descending"
}

/**
 * SearchNoteType 枚举
 * 搜索笔记的类型
 */
export enum SearchNoteType {
    /** 全部 */
    ALL = 0,
    /** 仅视频 */
    VIDEO = 1,
    /** 仅图片 */
    IMAGE = 2
}

/**
 * Note 接口
 * 代表一个笔记的数据结构
 */
export interface Note {
    /** 笔记ID */
    note_id: string;
    /** 标题 */
    title: string;
    /** 描述 */
    desc: string;
    /** 类型 */
    type: string;
    /** 用户信息 */
    user: Record<string, any>;
    /** 图片URL列表 */
    img_urls: string[];
    /** 视频URL */
    video_url: string;
    /** 标签列表 */
    tag_list: string[];
    /** 提及的用户列表 */
    at_user_list: string[];
    /** 收藏数 */
    collected_count: string;
    /** 评论数 */
    comment_count: string;
    /** 点赞数 */
    liked_count: string;
    /** 分享数 */
    share_count: string;
    /** 发布时间 */
    time: number;
    /** 最后更新时间 */
    last_update_time: number;
}

export interface NoteUrlInfo {
    note_id: string;
    xsec_token: string;
    xsec_source: string;
}
