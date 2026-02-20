export enum AltoVersionState {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
  STALE = 'STALE',
}

export interface AltoVersionContent {
  id: number;
  pid: string;
  version: number;
  username: string;
  state: AltoVersionState;
  createdAt: string;
  updatedAt: string;
  pageTitle: string;
  ancestorTitles: string[];
  content: string;
}

export interface AltoVersion {
  id: number;
  pid: string;
  version: number;
  instance: string;
  username: string;
  state: AltoVersionState;
  createdAt: string;
  updatedAt: string;
  pageTitle: string;
  pageIndex: number;
  ancestorPids: string[];
  ancestorTitles: string[];
}

export interface AltoVersionSearchRelatedRequest {
  instance?: string;
  targetPid?: string;
  hierarchyPid?: string;
  title?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  states?: AltoVersionState[];
  offset?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AltoVersionSearchRequest extends AltoVersionSearchRelatedRequest {
  users?: number[];
}
