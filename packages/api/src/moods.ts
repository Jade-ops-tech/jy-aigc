import { z } from "zod";

/**
 * 心情枚举——前后端共享的唯一事实来源。
 * 单独放在无服务端依赖的模块里，便于前端作为运行时值 import
 * （不会把 db/drizzle 等 Node 依赖打进浏览器包）。
 */
export const MOODS = ["平静", "柔软", "焦躁", "感恩", "沉重", "期待"] as const;

export type Mood = (typeof MOODS)[number];

export const moodSchema = z.enum(MOODS);
