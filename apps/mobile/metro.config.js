const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;
// Web-only packages live in the monorepo root; exclude them from Metro's watcher
// to avoid ENOENT crashes on transient pnpm/next-intl temp directories (Windows).
config.resolver.blockList = exclusionList([
  /node_modules[/\\]\.pnpm[/\\]next-intl[^/\\]*[/\\].*/,
  /node_modules[/\\]\.pnpm[/\\]next@[^/\\]*[/\\].*/,
  /node_modules[/\\]\.pnpm[/\\][^/\\]+[/\\]node_modules[/\\][^/\\]*_tmp_.*/,
  new RegExp(`${path.resolve(workspaceRoot, 'apps/web').replace(/\\/g, '\\\\')}[/\\\\].*`),
]);

module.exports = config;