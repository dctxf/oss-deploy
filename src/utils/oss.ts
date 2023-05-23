import fs from 'fs-extra';
import path from 'path';

// ali-oss 上传文件夹
// https://www.npmjs.com/package/ali-oss
// https://help.aliyun.com/document_detail/84781.html?spm=a2c4g.11186623.6.1206.5a6e5d0cZQ8Q8X
export async function uploadDir (client: any, prefix: any = '', localPath: any = './dist', onUploadSuccess?: any) {
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
      await client.put(`${prefix}/${file}`, filePath);
      onUploadSuccess?.(`${prefix}/${file}`)
    }
    if (stat.isDirectory()) {
      await uploadDir(client, `${prefix}/${file}`, filePath, onUploadSuccess);
    }
  }
}