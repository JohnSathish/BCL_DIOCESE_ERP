import type { ImageSourcePropType } from 'react-native';
import {
  getParishAppConfigData,
  isDedicatedParishApp as isDedicated,
  cmsSlugForApp as slugForApp,
  parishContextFromConfig as contextFromConfig,
  resolveParishAppId,
  type ParishAppConfigData,
  PARISH_APP_REGISTRY,
} from './parish-app-config.data';

export type ParishAppConfig = ParishAppConfigData & {
  logo: ImageSourcePropType;
  appIcon: ImageSourcePropType;
  heroImage?: ImageSourcePropType;
};

const LOGO_BY_APP: Record<string, ImageSourcePropType> = {
  'sacred-heart': require('../assets/parishes/sacred-heart/logo.png'),
};

function withAssets(data: ParishAppConfigData): ParishAppConfig {
  const logo = LOGO_BY_APP[data.appId] ?? LOGO_BY_APP['sacred-heart'];
  return { ...data, logo, appIcon: logo };
}

export { PARISH_APP_REGISTRY, resolveParishAppId, contextFromConfig as parishContextFromConfig };

export function getParishAppConfig(appId = resolveParishAppId()): ParishAppConfig {
  return withAssets(getParishAppConfigData(appId));
}

export function isDedicatedParishApp(cfg = getParishAppConfigData()): boolean {
  return isDedicated(cfg);
}

export function cmsSlugForApp(cfg = getParishAppConfig()): string {
  return slugForApp(cfg);
}
