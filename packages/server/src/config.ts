import { ServerOptions } from 'https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { strToNum } from './utils/safeTypes.js';

export interface Config {
  mode: 'test' | 'development';
  projectRoot: string;
  port: number;
  hostname: string;
  webRoot: string;
  https?: {
    key: string;
    cert: string;
  } & ServerOptions;
  upload?: {
    fileSizeSyncLimitMB: number;
    fileSizeLimitMB: number;
  };
}

const projectRoot: string = path.dirname(fileURLToPath(import.meta.url));

function parseJSON(filePath: string, allowMissing = false) {
  let text: string | undefined;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    if (allowMissing) {
      return {};
    }
    throw e;
  }
  return JSON.parse(text);
}


dotenv.config({ path: path.join(projectRoot, '.env') });

let userConfig: Config;
if (process.env.FLIP_CONFIG_PATH) {
  userConfig = parseJSON(process.env.FLIP_CONFIG_PATH);
} else {
  let configFile = path.join(projectRoot, 'flip.config.json');

  userConfig = parseJSON(configFile, true);
}

let defaultConfig: Omit<Config, 'mode'> = {
  port: 5127,
  hostname: '::',
  webRoot: projectRoot,
  upload: {
    fileSizeSyncLimitMB: 20,
    fileSizeLimitMB: 20,
  },
  projectRoot,
};

let config: Config;
if (process.env.NODE_ENV === 'test') {
  config = {
    mode: 'test',
    ...defaultConfig,
  };
} else {
  config = {
    ...defaultConfig,
    ...(userConfig || {}),
  };
  config.mode = config.mode ? config.mode : 'development';
}

const finalConfig: Config = {
  ...config,
  port:
    strToNum(process.env.FLIP_PORT) ||
    strToNum(process.env.PORT) ||
    config.port,
  hostname: process.env.FLIP_HOSTNAME || config.hostname,
  webRoot: process.env.FLIP_WEB_ROOT || config.webRoot,
  https:
    process.env.FLIP_HTTPS_KEY && process.env.FLIP_HTTPS_CERT
      ? {
          key: process.env.FLIP_HTTPS_KEY.replace(/\\n/g, '\n'),
          cert: process.env.FLIP_HTTPS_CERT.replace(/\\n/g, '\n'),
          ...(config.https || {}),
        }
      : config.https,
  upload:
    process.env.FLIP_UPLOAD_FILE_SYNC_SIZE_LIMIT_MB ||
    process.env.FLIP_UPLOAD_FILE_SIZE_LIMIT_MB
      ? {
          fileSizeSyncLimitMB:
            strToNum(process.env.FLIP_UPLOAD_FILE_SYNC_SIZE_LIMIT_MB) ||
            strToNum(process.env.FLIP_UPLOAD_FILE_SIZE_LIMIT_MB) ||
            config.upload!.fileSizeSyncLimitMB,
          fileSizeLimitMB:
            strToNum(process.env.FLIP_UPLOAD_FILE_SIZE_LIMIT_MB) ||
            config.upload!.fileSizeLimitMB,
        }
      : config.upload,
};

export default finalConfig;
