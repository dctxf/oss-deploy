import fs from 'fs-extra';
import path from 'path';

/**
 * 使用ali-oss上传文件到oss
 * 本地目录可以设置
 * oss目录可以设置
 * @param {*} client
 * @param {*} prefix 可为空
 * @param {*} localPath 可为空
 */
export async function uploadFiles (client: any, prefix: any = '', localPath: any = './dist') {
  // client 为oss客户端 实例化后的 判空
  if (!client) {
    return;
  }
  // 读取文件夹,获取文件列表
  const files = fs.readdirSync(localPath);
  // 上传文件
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.resolve(localPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const result = await client.put(`${prefix}/${file}`, filePath);
    }
  }
}