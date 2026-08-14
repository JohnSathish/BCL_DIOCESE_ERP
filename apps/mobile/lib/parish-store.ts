import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getParishAppConfig,
  isDedicatedParishApp,
  parishContextFromConfig,
} from './parish-app-config';

const KEY = 'bcl.parish.app.context';

export type ParishContext = {
  dioceseId: string;
  dioceseName: string;
  parishId: string;
  parishName: string;
  parishCode?: string;
  village?: string;
  favorite?: boolean;
};

type ParishState = {
  ready: boolean;
  context: ParishContext | null;
  hydrate: () => Promise<void>;
  setContext: (ctx: ParishContext) => Promise<void>;
  clear: () => Promise<void>;
};

export const useParishStore = create<ParishState>((set) => ({
  ready: false,
  context: null,

  hydrate: async () => {
    try {
      if (isDedicatedParishApp()) {
        const cfg = getParishAppConfig();
        const ctx = parishContextFromConfig(cfg);
        await AsyncStorage.setItem(KEY, JSON.stringify(ctx));
        set({ ready: true, context: ctx });
        return;
      }
      const raw = await AsyncStorage.getItem(KEY);
      set({ ready: true, context: raw ? (JSON.parse(raw) as ParishContext) : null });
    } catch {
      if (isDedicatedParishApp()) {
        const ctx = parishContextFromConfig(getParishAppConfig());
        set({ ready: true, context: ctx });
      } else {
        set({ ready: true, context: null });
      }
    }
  },

  setContext: async (ctx) => {
    await AsyncStorage.setItem(KEY, JSON.stringify(ctx));
    set({ context: ctx });
  },

  clear: async () => {
    if (isDedicatedParishApp()) {
      const ctx = parishContextFromConfig(getParishAppConfig());
      set({ context: ctx });
      return;
    }
    await AsyncStorage.removeItem(KEY);
    set({ context: null });
  },
}));

/** @deprecated multi-parish picker builds only */
export const DIRECTORY_DIOCESES = [
  {
    id: 'tura',
    name: 'Roman Catholic Diocese of Tura',
    state: 'Meghalaya',
    country: 'India',
  },
];

/** @deprecated use DIRECTORY_DIOCESES */
export const DEMO_DIOCESES = DIRECTORY_DIOCESES;

export const DIRECTORY_PARISHES: Array<{
  id: string;
  code: string;
  name: string;
  location: string;
  priest?: string;
  mass?: string;
  dioceseId: string;
}> = [];

/** @deprecated empty in production builds — load from API */
export const DEMO_PARISHES = DIRECTORY_PARISHES;
