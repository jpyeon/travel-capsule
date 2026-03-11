import type { ISODateTime } from './shared.types';

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: ISODateTime;
}
