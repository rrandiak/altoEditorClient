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
  ACCEPT_ENGINE_VERSIONS = 'ACCEPT_ENGINE_VERSIONS',
  REINDEX = 'REINDEX',
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
