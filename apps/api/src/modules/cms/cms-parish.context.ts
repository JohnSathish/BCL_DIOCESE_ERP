import { AsyncLocalStorage } from 'async_hooks';

/** Per-request selected CMS parish (from query or X-BCL-Parish-Id header). */
export const cmsParishAls = new AsyncLocalStorage<string | undefined>();

export function getRequestCmsParishId(): string | undefined {
  const id = cmsParishAls.getStore();
  return id && String(id).trim() ? String(id).trim() : undefined;
}
