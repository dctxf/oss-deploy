import { execSync } from "child_process";

// git 检查工作区是否干净
export function gitCheck () {
  const status = execSync(`git status --porcelain`).toString();
  if (status) {
    console.error('工作区不干净, 请先提交代码');
    process.exit(1);
  }
}
// git 检查分支 是否为master
export function gitBranch () {
  const branch = execSync(`git symbolic-ref --short -q HEAD`).toString();
  if (branch !== 'master') {
    console.error('当前分支不是master, 请切换到master分支');
    process.exit(1);
  }
}
// 提交commit
export function gitCommit (version: any) {
  execSync(`git add .`);
  execSync(`git commit -m "fix: v${version}"`);
}
// 添加标签
export function gitTag (version: any) {
  execSync(`git tag -a v${version} -m "v${version}"`);
}
// git 提交commit 并添加标签
export function gitCommitAndTag (version: any) {
  gitCommit(version)
  gitTag(version)
}
// 推送代码 并推送标签
export function gitPushAndTag (version: any) {
  execSync(`git push origin master`);
  execSync(`git push origin v${version}`);
}