import { AltoVersionSearchRequest } from './alto-version';

export enum BatchPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum BatchState {
  PLANNED = 'PLANNED',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export enum BatchSubstate {
  DOWNLOADING = 'DOWNLOADING',
  GENERATING = 'GENERATING',
  SAVING = 'SAVING',
}

export enum BatchType {
  GENERATE_SINGLE = 'GENERATE_SINGLE',
  RETRIEVE_HIERARCHY = 'RETRIEVE_HIERARCHY',
  GENERATE_FOR_HIERARCHY = 'GENERATE_FOR_HIERARCHY',
  ACCEPT_VERSIONS = 'ACCEPT_VERSIONS',
  REINDEX = 'REINDEX',
}

export enum HierarchyGenerateScope {
  ALL = 'ALL',
  NO_PENDING = 'NO_PENDING',
  NO_PENDING_NOR_ACTIVE = 'NO_PENDING_NOR_ACTIVE',
}

export interface HierarchyGenerateData {
  scope: HierarchyGenerateScope;
}

export interface PlanAcceptVersionsRequest {
  priority: BatchPriority;
  includePendingVersions: boolean;
  includeActiveVersions: boolean;
}

export interface BatchSearchFilters {
  pid?: string;
  state?: BatchState | string;
  substate?: BatchSubstate | string;
  /** ISO 8601 date-time string */
  createdAfter?: string;
  /** ISO 8601 date-time string */
  createdBefore?: string;
  /** ISO 8601 date-time string */
  updatedAfter?: string;
  /** ISO 8601 date-time string */
  updatedBefore?: string;
  createdBy?: string;
  priority?: BatchPriority | string;
  type?: BatchType | string;
  instance?: string;
  data?: HierarchyGenerateData | AltoVersionSearchRequest;
}

export interface Batch {
  id: number;
  type: BatchType | string;
  priority: BatchPriority | string;
  pid: string | null;
  altoVersionId: number | null;
  instance: string | null;
  engine: string | null;
  state: BatchState | string;
  substate: BatchSubstate | string | null;
  createdBy: string;
  createdAt: Date; // ISO 8601
  updatedAt: Date; // ISO 8601
  estimatedItemCount: number | null;
  processedItemCount: number | null;
  log: string | null;
}
