# oss-deploy

自动部署前端项目到 oss

## 使用

```bash
npm i oss-deploy -D
```

在 package.json 中添加命令

```json
{
  "scripts": {
    "pub": "oss-deploy"
  }
}
```

## 配置

- 配置文件默认在项目根目录下
- 配置文件默认为 `oss-deploy.config.json`
- 配置文件可以添加环境，如 `oss-deploy.config.dev.json`

在项目根目录下创建 `oss-deploy.config.json` 文件

```json
{
  "domain": "https://demo.com",
  "accessKeyId": "xxxxx",
  "accessKeySecret": "xxx",
  "bucket": "bucket-name",
  "region": "oss-cn-beijing",
  "build": "npm run build"
}
```

### 配置项

- `domain` 自定义域名可为空
- `accessKeyId` 阿里云 accessKeyId
- `accessKeySecret` 阿里云 accessKeySecret
- `bucket` 阿里云 bucket
- `region` 阿里云 region
- `build` 打包命令 默认为 `npm run build`
- `dist` 打包目录 默认为 `dist`
- `barkApi` bark 推送地址
- `refreshFilePath` 刷新文件路径 默认为 `./refresh.txt`
