export interface TsAppVersion {
  version: string;
  name: string;
  description?: string;
  versionLong?: string;
  versionDate: string;
  gitCommitHash?: string;
  gitCommitDate?: string;
  gitTag?: string;
}
export const versions: TsAppVersion = {
  version: '0.0.0',
  name: 'opentakserver-ui',
  versionDate: '2026-10-07T15:50:38.366Z',
  gitCommitHash: '77a0f89',
  versionLong: '0.0.0-77a0f89',
};
export default versions;
