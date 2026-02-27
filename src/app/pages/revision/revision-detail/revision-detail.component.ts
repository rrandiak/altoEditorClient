import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSplitModule } from 'angular-split';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AppService } from 'src/app/app.service';
import { AppConfiguration } from 'src/app/app-configuration';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppState } from 'src/app/shared/app.state';
import { HighlightModule } from 'ngx-highlightjs';
import { js2xml, xml2js } from 'xml-js';
import { base64ToUtf8, utf8ToBase64, prettifyXml } from 'src/app/shared/utils';
import { OcrEditorComponent } from 'src/app/components/ocr-editor/ocr-editor.component';
import { ViewerComponent } from 'src/app/components/viewer/viewer.component';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { SearchResults } from 'src/app/shared/search-results';
import { AltoVersion, AltoVersionContent } from 'src/app/shared/alto-version';
import { RevisionListStateService } from 'src/app/shared/revision-list-state.service';
import {
  PlanProcessDialogComponent,
  PlanProcessDialogData,
} from 'src/app/components/plan-process-dialog/plan-process-dialog.component';
import { UserInfo } from 'src/app/shared/user-info';
import { BatchPriority } from 'src/app/shared/batch';
import { BatchPollingService } from 'src/app/shared/batch-polling.service';
import { AppDateTimePipe } from 'src/app/shared/app-date-time.pipe';

@Component({
  selector: 'app-revision-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AngularSplitModule,
    MatButtonToggleModule,
    MatMenuModule,
    MatDialogModule,
    TranslateModule,
    RouterModule,
    OcrEditorComponent,
    ViewerComponent,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    HighlightModule,
    AppDateTimePipe,
  ],
  templateUrl: './revision-detail.component.html',
  styleUrls: ['./revision-detail.component.scss'],
})
export class RevisionDetailComponent {
  public pid: string | null = null;
  public version: number | null = null;
  public selectedVersionIndex: number | null = null;
  public selectedVersion: AltoVersionContent | null = null;
  versions: AltoVersion[] = [];
  activeVersion: AltoVersionContent | null = null;
  activeVersionAlto: string | null = null;
  activeVersionOcr: any | null = null;
  selectedVersionAlto: string | null = null;
  selectedVersionOcr: any | null = null;

  panel0Mode = 'ocr';
  panelMode = 'ocr';
  viewerWidth: number;

  displayedColumns: string[] = ['updatedAt', 'username', 'version', 'state'];

  divZoom = 1;
  imgW = 100;

  hor_size = 50;
  top_left_size = 50;
  bottom_left_size = 50;

  constructor(
    private batchPolling: BatchPollingService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private config: AppConfiguration,
    private service: AppService,
    public state: AppState,
    private revisionListState: RevisionListStateService,
  ) {}

  ngOnInit() {
    this.hor_size = localStorage.getItem('revize_hor')
      ? parseInt(localStorage.getItem('revize_hor'))
      : 50;

    this.top_left_size = localStorage.getItem('revize_tl')
      ? parseInt(localStorage.getItem('revize_tl'))
      : 50;

    this.bottom_left_size = localStorage.getItem('revize_bl')
      ? parseInt(localStorage.getItem('revize_bl'))
      : 50;

    this.route.params.subscribe((params) => {
      this.pid = params['pid'];
      const v = params['version'];
      const ver = v != null ? parseInt(v, 10) : NaN;
      this.version = !isNaN(ver) ? ver : null;

      this.clearVersionOcrState();

      const items = this.revisionListState.items;
      if (items.length && this.pid) {
        const idx =
          this.version != null
            ? items.findIndex(
                (i) => i.pid === this.pid && i.version === this.version,
              )
            : items.findIndex((i) => i.pid === this.pid);
        if (idx >= 0) this.revisionListState.currentIndex = idx;
      }
      this.getVersions();
      if (this.version != null) {
        this.getSelectedVersion();
      }
      this.getActiveVersion();
    });
  }

  asDragEndHor(e: any) {
    localStorage.setItem('revize_hor', String(e.sizes[0]));
  }

  asDragEndTop(e: any) {
    localStorage.setItem('revize_tl', String(e.sizes[0]));
  }

  asDragEndBottom(e: any) {
    localStorage.setItem('revize_bl', String(e.sizes[0]));
    this.viewerWidth = e.sizes[0];
  }

  /** Clear OCR/version state so we don't show stale content when navigating to empty pages. */
  private clearVersionOcrState(): void {
    this.selectedVersion = null;
    this.selectedVersionAlto = null;
    this.selectedVersionOcr = null;
    this.activeVersion = null;
    this.activeVersionAlto = null;
    this.activeVersionOcr = null;
    this.state.altoXml = null;
    this.state.alto = null;
    this.state.printSpace = null;
    this.state.clearSelection();
  }

  getVersions() {
    this.service
      .searchAltoVersions({
        targetPid: this.pid,
      })
      .subscribe((res: SearchResults<AltoVersion>) => {
        this.versions = res.items ?? [];
        if (this.versions.length && this.version == null) {
          const latest = this.versions[this.versions.length - 1].version;
          this.version = latest;
          this.router.navigate(['/revision', this.pid, latest], {
            replaceUrl: true,
          });
          this.getSelectedVersion();
        }
      });
  }

  getSelectedVersion() {
    if (this.pid == null || this.version == null) return;
    const pid = this.pid;
    const version = this.version;
    this.service.fetchAltoVersion(pid, version).subscribe({
      next: (res: AltoVersionContent) => {
        if (this.pid !== pid || this.version !== version) return; // stale
        this.selectedVersion = res;
        this.selectedVersionAlto = prettifyXml(base64ToUtf8(res.content));
        this.selectedVersionOcr = this.state.setPrintSpace(
          xml2js(this.selectedVersionAlto),
        );
        this.state.altoXml = this.selectedVersionAlto;
        this.state.alto = xml2js(this.selectedVersionAlto);
        this.state.printSpace = this.selectedVersionOcr;
        this.state.clearSelection();
      },
      error: () => {
        if (this.pid !== pid || this.version !== version) return;
        this.selectedVersion = null;
        this.selectedVersionAlto = null;
        this.selectedVersionOcr = null;
        this.state.altoXml = null;
        this.state.alto = null;
        this.state.printSpace = null;
        this.state.clearSelection();
      },
    });
  }

  getActiveVersion() {
    if (this.pid == null || this.version === null) return;
    const pid = this.pid;
    this.service.fetchActiveAltoVersion(pid).subscribe({
      next: (res: AltoVersionContent) => {
        if (this.pid !== pid) return; // stale
        this.activeVersion = res;
        this.activeVersionAlto = prettifyXml(base64ToUtf8(res.content));
        this.activeVersionOcr = this.state.setPrintSpace(
          xml2js(this.activeVersionAlto),
        );
      },
      error: () => {
        if (this.pid !== pid) return;
        this.activeVersion = null;
        this.activeVersionAlto = null;
        this.activeVersionOcr = null;
      },
    });
  }

  selectVersion(version: number) {
    this.version = version;
    this.router.navigate(['/revision', this.pid, version], {
      replaceUrl: true,
    });
    this.getSelectedVersion();
  }

  acceptVersion() {
    if (!this.selectedVersion) return;
    this.service.acceptAltoVersion(this.selectedVersion.id).subscribe({
      next: () => {
        this.service.showSnackBar('desc.acceptSuccess');
        this.getVersions();
        this.getActiveVersion();
      },
      error: (err) =>
        this.service.showSnackBar(
          err?.error?.errors?.[0] ?? 'message.error',
          true,
        ),
    });
  }

  rejectVersion() {
    if (!this.selectedVersion) return;
    this.service.rejectAltoVersion(this.selectedVersion.id).subscribe({
      next: () => {
        this.service.showSnackBar('desc.rejectSuccess');
        this.getVersions();
        this.getActiveVersion();
        this.getSelectedVersion();
      },
      error: (err) =>
        this.service.showSnackBar(
          err?.error?.errors?.[0] ?? 'message.error',
          true,
        ),
    });
  }

  archiveVersion() {
    if (!this.selectedVersion) return;
    this.service.archiveAltoVersion(this.selectedVersion.id).subscribe({
      next: () => {
        this.service.showSnackBar('desc.archiveSuccess');
        this.getVersions();
        this.getActiveVersion();
        this.getSelectedVersion();
      },
      error: (err) =>
        this.service.showSnackBar(
          err?.error?.errors?.[0] ?? 'message.error',
          true,
        ),
    });
  }

  openGeneratePriorityDialog(engine: UserInfo): void {
    this.dialog
      .open(PlanProcessDialogComponent, {
        data: {
          title: 'actionTitle.generateSinglePageAlto',
          titleParams: { engine: engine.username },
        } as PlanProcessDialogData,
        width: '320px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.priority) {
          this.generateWithEngine(engine, result.priority);
        }
      });
  }

  generateWithEngine(engine: UserInfo, priority: BatchPriority): void {
    if (!this.pid) return;
    this.service
      .generateAlto(this.pid, engine.username, priority, this.config.instance)
      .subscribe({
        next: (res: any) => {
          if (res?.errors?.length) {
            this.service.showSnackBar(res.errors[0], true);
          } else {
            this.batchPolling.triggerCheck();
            this.service.showSnackBar('message.altoVersionGenerationPlanned');
          }
        },
        error: (err) =>
          this.service.showSnackBar(
            err?.error?.message || 'message.error',
            true,
          ),
      });
  }

  /** Save current edits of the selected version (same as editing page). */
  save() {
    if (!this.pid || !this.state.alto) return;
    const altoContent = utf8ToBase64(js2xml(this.state.alto));
    this.service.saveAltoVersion(this.pid, altoContent).subscribe({
      next: (res: AltoVersion) => {
        this.service.showSnackBar('message.altoVersionSaved');
        this.state.clearSelection();
        this.selectVersion(res.version);
        this.getSelectedVersion();
        this.getVersions();
      },
      error: (err) =>
        this.service.showSnackBar(
          err?.error?.errors?.[0] ?? 'message.error',
          true,
        ),
    });
  }

  setArea(data: { blockIdx: number; lineIdx: number; wordIdx: number }) {
    // const b = this.state.selectedBlocks[0];
    this.state.clearSelection();
    this.state.selectedBlocks = [this.state.printSpace.elements[data.blockIdx]];
    this.state.selectedLines = [
      this.state.selectedBlocks[0].elements[data.lineIdx],
    ];
    this.state.selectedWords = [
      this.state.selectedBlocks[0].elements[data.lineIdx].elements[
        data.wordIdx
      ],
    ];
    this.state.selectedAlto = {
      blocks: this.state.selectedBlocks,
      lines: this.state.selectedLines,
      words: this.state.selectedWords,
    };
  }

  splitChanged(e: any) {
    this.viewerWidth = e.sizes[0];
  }

  zoom(scale: number) {
    this.divZoom = this.divZoom * scale;
    this.viewerWidth = this.viewerWidth * scale;
  }

  zoomReset() {
    this.divZoom = 1;
  }

  zoomImg(scale: number) {
    this.imgW = this.imgW * scale;
  }

  zoomImgReset() {
    this.imgW = 100;
  }

  get hasListContext(): boolean {
    const items = this.revisionListState.items;
    return items.length > 0 && this.revisionListState.searchRequest != null;
  }

  /** ALTO Page WIDTH/HEIGHT for coordinate scaling. */
  getAltoPageBounds(): { width: number; height: number } | null {
    return this.state.getAltoPageBounds(this.state.alto);
  }

  get canGoPrev(): boolean {
    if (!this.hasListContext) return false;
    const items = this.revisionListState.items;
    const idx = this.revisionListState.currentIndex;
    const pageIdx = this.revisionListState.pageIndex;
    return idx > 0 || (idx === 0 && pageIdx > 0);
  }

  get canGoNext(): boolean {
    if (!this.hasListContext) return false;
    const items = this.revisionListState.items;
    const idx = this.revisionListState.currentIndex;
    const pageIdx = this.revisionListState.pageIndex;
    const pageSize = this.revisionListState.pageSize;
    const total = this.revisionListState.totalRows;
    return (
      idx < items.length - 1 ||
      (idx === items.length - 1 && (pageIdx + 1) * pageSize < total)
    );
  }

  goToPrev(): void {
    if (!this.canGoPrev) return;
    const items = this.revisionListState.items;
    const idx = this.revisionListState.currentIndex;
    if (idx > 0) {
      const prev = items[idx - 1];
      this.revisionListState.currentIndex = idx - 1;
      this.router.navigate(['/revision', prev.pid, prev.version]);
      return;
    }
    const req = this.revisionListState.searchRequest!;
    const pageSize = req.limit ?? 25;
    const newOffset = Math.max(
      0,
      (this.revisionListState.pageIndex - 1) * pageSize,
    );
    const prevReq = { ...req, offset: newOffset, limit: pageSize };
    this.service.searchAltoVersions(prevReq).subscribe((res) => {
      const prevItems = res.items ?? [];
      if (prevItems.length === 0) return;
      const last = prevItems[prevItems.length - 1];
      this.revisionListState.items = prevItems;
      this.revisionListState.searchRequest = prevReq;
      this.revisionListState.currentIndex = prevItems.length - 1;
      this.router.navigate(['/revision', last.pid, last.version]);
    });
  }

  goToNext(): void {
    if (!this.canGoNext) return;
    const items = this.revisionListState.items;
    const idx = this.revisionListState.currentIndex;
    if (idx < items.length - 1) {
      const next = items[idx + 1];
      this.revisionListState.currentIndex = idx + 1;
      this.router.navigate(['/revision', next.pid, next.version]);
      return;
    }
    const req = this.revisionListState.searchRequest!;
    const pageSize = req.limit ?? 25;
    const newOffset = (this.revisionListState.pageIndex + 1) * pageSize;
    const nextReq = { ...req, offset: newOffset, limit: pageSize };
    this.service.searchAltoVersions(nextReq).subscribe((res) => {
      const nextItems = res.items ?? [];
      if (nextItems.length === 0) return;
      const first = nextItems[0];
      this.revisionListState.items = nextItems;
      this.revisionListState.searchRequest = nextReq;
      this.revisionListState.currentIndex = 0;
      this.router.navigate(['/revision', first.pid, first.version]);
    });
  }

  backToResults(): void {
    const params = this.revisionListState.buildResultsQueryParams();
    this.router.navigate(['/revision'], { queryParams: params });
  }
}
