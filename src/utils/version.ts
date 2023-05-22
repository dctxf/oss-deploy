import semver from 'semver';

/**
 * 根据发布类型 生成新版本
 * 'major', 'minor', 'patch', 'none'
 * none 为保持原版本信息不变
 *  */
export function getVersion (version: string, packageVersion: string) {
  const pv = semver.parse(packageVersion);
  if (!pv) {
    throw new Error('packageVersion is not valid');
  }
  let nv = packageVersion;

  if (version === 'major') {
    nv = semver.inc(pv, 'major') as string;
  }
  if (version === 'minor') {
    nv = semver.inc(pv, 'minor') as string;
  }
  if (version === 'patch') {
    nv = semver.inc(pv, 'patch') as string;
  }

  return nv;
}