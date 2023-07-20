#!/usr/bin/env node

import { pushByBark } from '@dctxf/service';
import OSS from 'ali-oss';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { program } from 'commander';
import dayjs from 'dayjs';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';
import { getConfig, getConfigPath } from './utils/config.js';
import { uploadDir } from './utils/oss.js';
import { getVersion } from './utils/version.js';

const prompt = inquirer.createPromptModule();

// 获取项目根目录的package.json
const packageJson = fs.readFileSync(path.resolve('./package.json'));
// 获取项目名称和版本号
const { name, version: packageVersion } = JSON.parse(packageJson.toString());

// commander 配置
// 获取当前命令的版本号
const str = fs.readFileSync(
  path.resolve('./node_modules/oss-deploy/package.json')
);
const { version: commanderVersion, name: commanderName } = JSON.parse(
  str.toString()
);

const build = async (buildCommand: string, newVersion: string) => {
  const spinner = ora().start('打包开始');
  spinner.succeed('配置文件读取完成');

  spinner.succeed(`新版本为: ${newVersion}`);

  spinner.start('开始修改版本号');
  // 修改版本号
  fs.writeFileSync(
    path.resolve('./package.json'),
    JSON.stringify(
      {
        ...JSON.parse(packageJson.toString()),
        version: newVersion,
      },
      null,
      2
    )
  );
  spinner.succeed('修改版本号完成');

  // 开始打包
  spinner.start('开始打包');
  // 执行打包命令 如果配置中存在build命令则执行配置中的build命令
  if (buildCommand) {
    execSync(buildCommand, { stdio: 'inherit' });
  } else {
    execSync(`npm run build`, { stdio: 'inherit' });
  }
  spinner.succeed('打包完成');
  spinner.clear();
};

const refresh = async (options: any) => {
  // 获取参数
  const { i, k, r, t, a, o } = options;
  // 脚本路径
  const scriptPath = path.resolve('./scripts/refresh.py');
  execSync(`python3 ${scriptPath} -i ${i} -k ${k} -t ${t} -r ${r} -o ${o}`);
};

program
  .name(commanderName)
  .description('oss-deploy 是一款帮助你快速发布前端项目到阿里云oss的工具')
  .version(commanderVersion, '-v, --version', '查看版本号')
  .helpOption('-h, --help', '查看帮助信息')
  // 默认为发布命令
  .action(() => {
    // 检查配置文件
    getConfigPath();
    // prompt 配置
    prompt([
      {
        type: 'input',
        name: 'commit',
        message: `请输入提交信息`,
        default: 'chore: auto commit',
      },
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
    ]).then(async ({ commit, version, env, isUpload, isTag, isPush }) => {
      const spinner = ora('自动化打包并上传到阿里云OSS').start('任务开始');
      // 获取配置
      const config = getConfig(env);
      // 获取新版本
      const newVersion = getVersion(version, packageVersion);
      await build(config.build, newVersion);

      // 根据配置判断是否生成打包信息文件
      if (config.version) {
        spinner.succeed(`生成版本文件: ${newVersion}`);
        fs.writeJSONSync(path.resolve(`./public/version.json`), {
          name,
          version: newVersion,
          timestamp: +new Date(),
          date: dayjs().format(),
        });
        spinner.succeed('生成版本文件完成');
        spinner.clear();
      }

      // 开始上传文件到oss
      const {
        accessKeyId,
        accessKeySecret,
        region,
        bucket,
        prefix,
        dist,
        refreshFilePath,
      } = config;
      // 如果需要上传 则上传
      if (isUpload) {
        spinner.start('上传文件到oss');
        // 根据配置文件中的配置上传本地文件夹中的文件到oss
        try {
          // 上传文件到oss 使用ali-oss
          const client = new OSS({
            region,
            accessKeyId,
            accessKeySecret,
            bucket,
          });
          // 上传文件到oss 配置中的目录
          await uploadDir(client, prefix, dist, (filePath: string) => {
            spinner.succeed(`上传文件到oss: ${filePath}`);
          });
          spinner.succeed('上传文件到oss完成');
        } catch (error) {
          spinner.fail(`上传文件到oss失败: ${(error as Error).message}`);
          spinner.clear();
          process.exit(1);
        }
      }

      // 检查工作区是否干净，不干净则提交代码
      const isClean =
        execSync(`git status --porcelain`).toString().trim() === '';
      if (!isClean) {
        spinner.start('工作区不干净，提交代码');
        execSync(`git add .`);
        execSync(`git commit -m "${commit}"`);
        spinner.succeed('工作区干净');
      }
      // 如果需要打标签 则打标签
      if (isTag) {
        spinner.start(`打标签: v${newVersion}`);
        execSync(`git tag -a v${newVersion} -m "v${newVersion}"`);
        spinner.succeed('打标签完成');
      }

      // 如果需要提交代码 则提交代码 如果有标签并推送标签
      if (isPush) {
        spinner.start('提交代码');
        // 如果远端不存分支则创建分支并推送
        execSync(`git push -u origin HEAD`);
        spinner.succeed('提交代码完成');
        if (isTag) {
          spinner.start(`推送标签: v${newVersion}`);
          execSync(`git push origin v${newVersion}`);
          spinner.succeed('推送标签完成');
        }
      }

      spinner.succeed('发布完成');
      spinner.stop();

      try {
        // 刷新CDN缓存 执行Python脚本
        spinner.start('刷新CDN缓存');
        await refresh({
          i: accessKeyId,
          k: accessKeySecret,
          r: refreshFilePath || path.resolve(`./refresh.txt`),
          t: 'clear',
          o: 'Directory',
        });
      } catch (error) {
        spinner.fail(`刷新CDN缓存失败: ${(error as Error).message}`);
        spinner.clear();
      }

      // 打印出域名，方便复制，且彩色展示
      console.log(chalk.green(`\n发布成功，域名为: ${config.domain}\n`));
      // 推送bark消息
      if (config.barkApi) {
        spinner.start('推送bark消息');
        try {
          //
          pushByBark({
            apiUrl: config.barkApi,
            title: `${name} ${newVersion} 发布成功`,
            body: `域名为: ${config.domain}`,
            group: `${name}_${env}`,
            url: config.domain,
          });
          spinner.succeed('推送bark消息完成');
        } catch (error) {
          pushByBark({
            apiUrl: config.barkApi,
            title: `${name} ${newVersion} 发布失败`,
            body: `域名为: ${config.domain}`,
            group: `${name}_${env}`,
            url: config.domain,
          });
          spinner.fail(`推送bark消息失败: ${(error as Error).message}`);
        }
      }
    });
  });

// 打包命令
program
  .command('build')
  .description('打包')
  .option('-env <env>', '环境变量')
  .option(
    '-release <release>',
    '版本号 major: 主版本号+1，minor: 次版本号+1，patch: 修订号+1, none: 不变'
  )
  .action(async ({ Env, Release }) => {
    // 获取配置
    const config = getConfig(Env);
    // 获取新版本
    const newVersion = getVersion(Release, packageVersion);
    await build(config.build, newVersion);
  });

// 刷新缓存
program
  .command('refresh')
  .description('刷新oss缓存')
  .option('-env <env>', '环境变量')
  .option(
    '-r <filename>',
    'filename指“文件所在的路径+文件名称”，自动化脚本运行后将会读取文件内记录的URL；文件内的URL记录方式为每行一条URL，有特殊字符先做URLencode，以http或https开头；'
  )
  .option('-t  <taskType>', '任务类型，clear：刷新，push：预热；', 'clear')
  .option(
    '-a  [String,<domestic|overseas>]',
    '可选项，预热范围，不传默认是全球；domestic：仅中国内地；overseas：全球（不包含中国内地）；',
    'overseas'
  )
  .option(
    '-o  [String,<File|Directory>]',
    '可选项，刷新的类型；File：文件刷新（默认值）；Directory：目录刷新',
    'File'
  )
  .action(async (options) => {
    // 获取参数
    const { env, t, a, o } = options;
    const spinner = ora('刷新oss缓存').start('任务开始');
    // 刷新oss缓存
    const config = getConfig(env);
    const { accessKeyId, accessKeySecret, refreshFilePath } = config;
    try {
      // 刷新CDN缓存 执行Python脚本
      spinner.start('刷新CDN缓存');
      await refresh({
        i: accessKeyId,
        k: accessKeySecret,
        r: refreshFilePath,
        t,
        o,
      });
    } catch (error) {
      spinner.fail(`刷新CDN缓存失败: ${(error as Error).message}`);
      spinner.clear();
    }
  });
// 解析命令行参数
program.parse(process.argv);
