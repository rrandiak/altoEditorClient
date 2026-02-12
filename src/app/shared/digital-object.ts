export interface KrameriusDO {
  pid: string;
  model: string;
  title: string;
  level: number;
  childrenCount: number;
  pagesCount: number;
  parentPid: string;
  rootPid: string;
}

export interface DOHierarchy {
  pid: string;
  model: string;
  title: string;
  level: number;
  parentPid: string;
  indexInParent: number;
  rootPid: string;
  pagesCount: number;
  pagesWithAlto: number;
}

export interface DOHierarchySearchRequest {
  pid?: string;
  parentPid?: string;
  model?: string;
  title?: string;
  level?: number;
  offset?: number;
  limit?: number;
}
