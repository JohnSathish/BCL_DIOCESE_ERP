import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const raw = await AsyncStorage.getItem(KEY);
      set({ ready: true, context: raw ? (JSON.parse(raw) as ParishContext) : null });
    } catch {
      set({ ready: true, context: null });
    }
  },

  setContext: async (ctx) => {
    await AsyncStorage.setItem(KEY, JSON.stringify(ctx));
    set({ context: ctx });
  },

  clear: async () => {
    await AsyncStorage.removeItem(KEY);
    set({ context: null });
  },
}));

/**
 * Offline fallbacks only when public directory APIs are unreachable.
 * Prefer live `/parishes` and mobile CMS — do not treat these as product data.
 */
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
