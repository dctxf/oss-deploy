#!/usr/bin/env node

import OSS from 'ali-oss';
import { execSync } from 'child_process';
import { program } from 'commander';
import dayjs from 'dayjs';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import { getConfig, getConfigPath } from './utils/config.js';
import { uploadFiles } from './utils/oss.js';
import { getVersion } from './utils/version.js';

const prompt = inquirer.createPromptModule();

// 获取项目根目录的package.json
const packageJson = fs.readFileSync(path.resolve('./package.json'));
// 获取项目名称和版本号
const { name, version: packageVersion } = JSON.parse(packageJson.toString());

// commander 配置
// 获取当前命令的版本号
const str = fs.readFileSync(path.resolve('./node_modules/commander/package.json'));
const { version: commanderVersion, name: commanderName } = JSON.parse(str.toString());

program
  .name(commanderName)
  .description('oss-deploy 是一款帮助你快速发布前端项目到阿里云oss的工具')
  .version(commanderVersion)

// -v --version
program
  .option('-v, --version', '查看版本号')
program.parse(process.argv);

// 检查配置文件
getConfigPath();

// prompt 配置
prompt([
  {
    type: 'list',
    name: 'version',
    message: `请选择要发布的版本, 当前版本为: ${packageVersion}`,
    default: 'patch',
    choices: ['major', 'minor', 'patch', 'none'],
    loop: true,
  },
  {
    type: 'list',
    name: 'env',
    message: '请选择要发布的环境',
    default: 'dev',
    choices: ['dev', 'prod', 'none'],
    loop: true,
  },
  {
    type: 'confirm',
    name: 'isUpload',
    message: '是否要上传',
    default: true,
  },
  {
    type: 'confirm',
    name: 'isTag',
    message: '是否要打标签',
    default: false,
  },
  {
    type: 'confirm',
    name: 'isPush',
    message: '是否提交代码',
    default: true,
  },
]).then(async ({ version, env, isUpload, isTag, isPush }) => {
  const spinner = ora('自动化打包并上传到阿里云OSS').start('任务开始');
  // 获取配置
  const config = getConfig(env);
  spinner.succeed('配置文件读取完成')
  // 获取新版本
  const newVersion = getVersion(version, packageVersion);
  spinner.succeed(`新版本为: ${newVersion}`);
  // 开始打包
  spinner.start('开始打包');
  // 执行打包命令 如果配置中存在build命令则执行配置中的build命令
  if (config.build) {
    execSync(config.build, { stdio: 'inherit' });
  } else {
    execSync(`npm run build`, { stdio: 'inherit' });
  }
  spinner.succeed('打包完成');

  // 根据配置判断是否生成打包信息文件
  if (config.version) {
    spinner.succeed(`生成版本文件: ${newVersion}`);
    fs.writeJSONSync(path.resolve(`./public/version.json`), {
      name,
      version: newVersion,
      timestamp: +new Date(),
      date: dayjs().format()
    })
    spinner.succeed('生成版本文件完成');
  }

  // 开始上传文件到oss
  // 如果需要上传 则上传
  if (isUpload) {
    spinner.start('上传文件到oss')
    // 根据配置文件中的配置上传本地文件夹中的文件到oss
    const ossConfig = config.oss;
    try {
      if (ossConfig) {
        const { accessKeyId, accessKeySecret, region, bucket, prefix, dist } = ossConfig;
        // 上传文件到oss 使用ali-oss
        const client = new OSS({
          region,
          accessKeyId,
          accessKeySecret,
          bucket,
        });
        // 上传文件到oss 配置中的目录
        await uploadFiles(client, prefix, dist);
        spinner.succeed('上传文件到oss完成');
      }
    } catch (error) {
      spinner.fail('上传文件到oss失败');
      spinner.clear()
      process.exit(1);
    }
  }

  // 检查工作区是否干净，不干净则提交代码
  const isClean = execSync(`git status --porcelain`).toString().trim() === '';
  if (!isClean) {
    spinner.start('工作区不干净，提交代码');
    execSync(`git add .`);
    execSync(`git commit -m "chore: auto commit"`);
    spinner.succeed("工作区干净");
  }
  // 如果需要打标签 则打标签
  if (isTag) {
    spinner.start(`打标签: v${newVersion}`)
    execSync(`git tag -a v${newVersion} -m "v${newVersion}"`);
    spinner.succeed('打标签完成')
  }

  // 如果需要提交代码 则提交代码 如果有标签并推送标签
  if (isPush) {
    spinner.start('提交代码')
    execSync(`git push origin master`);
    spinner.succeed('提交代码完成');
    if (isTag) {
      spinner.start(`推送标签: v${newVersion}`)
      execSync(`git push origin v${newVersion}`);
      spinner.succeed('推送标签完成');
    }
  }

  spinner.succeed('发布完成');
  spinner.stop()
});
