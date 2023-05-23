import fs from 'fs-extra';
import path from 'path';

// 获取js或者json文件中的配置
export const getConfigContent = (configPath?: string) => {
  if (!configPath) {
    throw new Error("配置文件路径不能为空");
  }
  const ext = path.extname(configPath);
  if (ext === '.json') {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      console.warn("配置文件不存在, 将使用默认配置")
      return {}
    }
  } else {
    // 如果都不是提示错误 并终止
    throw new Error('配置文件格式错误');
  }
}

/**
 * 根据环境获取配置文件路径
 * @param {string} env 环境 可为空
 * @returns {string} 配置文件路径
 * */
export const getConfigPath = (env?: string): string => {
  // 获取配置文件路径
  let configPath = path.resolve('./oss-deploy.config');
  if (env) {
    configPath = path.resolve(`./oss-deploy.config.${env}`);
  }
  // 如果是json
  return `${configPath}.json`;
}

// 合并多个配置文件内容
export const mergeConfig = (...configs: any[]) => {
  return configs.reduce((prev, curr) => {
    return {
      ...prev,
      ...curr,
    }
  }, {});
}

// 获取配置文件内容
export const getConfig = (env?: string) => {
  // 获取默认配置文件内容
  const configPath = getConfigPath();
  let configContent = getConfigContent(configPath);
  // 如果有环境变量则获取环境变量配置文件内容 并合并到默认配置文件内容中
  if (env) {
    const envConfigPath = getConfigPath(env);
    const envConfigContent = getConfigContent(envConfigPath);
    configContent = mergeConfig(configContent, envConfigContent);
  }
  return configContent;
}