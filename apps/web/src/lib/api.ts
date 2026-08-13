import { createApiClient } from '@bcl/sdk';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = createApiClient(API_BASE);
