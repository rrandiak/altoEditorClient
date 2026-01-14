export interface KrameriusDocument {
  root_title: string;
  pid: string;
  link: string;
  authors?: string[];
  model: string;
  title: string;
  page_count?: number;
  volume_count?: number;
  issue_count?: number;
  monograph_unit_count?: number;
  all_pages_count?: number;
}
