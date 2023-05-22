import fs from 'fs-extra';
import path from 'path';

// 获取js或者json文件中的配置
export const getConfigContent = (configPath?: string) => {
  if (!configPath) {
    console.error('配置文件路径不能为空');
    process.exit(1);
  }
  const ext = path.extname(configPath);
  try {
    // 如果是js文件则获取默认导出
    if (ext === '.js') {
      const config = require(configPath);
      console.log(config)
      return config.default || config;
    } else if (ext === '.json') {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      // 如果都不是提示错误 并终止
      console.error('配置文件格式错误');
      process.exit(1);
    }
  } catch (error) {
    return {};
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
  if (fs.existsSync(`${configPath}.json`)) {
    configPath = `${configPath}.json`;
    return configPath;
  }
  configPath = `${configPath}.js`;
  return configPath;
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
  console.log('configPath', configPath)
  let configContent = getConfigContent(configPath);
  console.log('configContent', configContent)
  // 如果有环境变量则获取环境变量配置文件内容 并合并到默认配置文件内容中
  if (env) {
    const envConfigPath = getConfigPath(env);
    const envConfigContent = getConfigContent(envConfigPath);
    console.log('envConfigContent', envConfigContent)
    configContent = mergeConfig(configContent, envConfigContent);
  }
  return configContent;
}