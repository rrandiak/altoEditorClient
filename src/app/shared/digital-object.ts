/** Kramerius document model enum; values match backend Model enum. */
export enum Model {
  PERIODICAL = 'periodical',
  PERIODICALVOLUME = 'periodicalvolume',
  PERIODICALITEM = 'periodicalitem',
  SUPPLEMENT = 'supplement',
  ARTICLE = 'article',
  MONOGRAPH = 'monograph',
  MONOGRAPHUNIT = 'monographunit',
  GRAPHIC = 'graphic',
  MAP = 'map',
  SHEETMUSIC = 'sheetmusic',
  ARCHIVE = 'archive',
  MANUSCRIPT = 'manuscript',
  CONVOLUTE = 'convolute',
  PICTURE = 'picture',
  SOUNDRECORDING = 'soundrecording',
  TRACK = 'track',
  SOUNDUNIT = 'soundunit',
  INTERNALPART = 'internalpart',
  COLLECTION = 'collection',
  PAGE = 'page',
}

export const TOP_MODELS = [
  Model.PERIODICAL,
  Model.MONOGRAPH,
  Model.GRAPHIC,
  Model.MAP,
  Model.SHEETMUSIC,
  Model.ARCHIVE,
  Model.MANUSCRIPT,
  Model.CONVOLUTE,
  Model.PICTURE,
  Model.SOUNDRECORDING,
];

export const ALL_MODELS = Object.values(Model).filter(
  (v): v is Model => typeof v === 'string',
) as Model[];

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
  hasSubhierarchy: boolean;
}

export interface DOHierarchySearchRequest {
  pid?: string;
  parentPid?: string;
  model?: string;
  title?: string;
  level?: number;
  offset?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
