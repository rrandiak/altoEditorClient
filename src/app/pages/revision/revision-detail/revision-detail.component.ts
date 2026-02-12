import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSplitModule } from 'angular-split';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AppService } from 'src/app/app.service';
import { AppConfiguration } from 'src/app/app-configuration';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Version } from 'src/app/shared/version';
import { AppState } from 'src/app/shared/app.state';
import { HighlightModule } from 'ngx-highlightjs';
import { js2xml, xml2js } from 'xml-js';
import { base64ToUtf8, utf8ToBase64, prettifyXml } from 'src/app/shared/utils';
import { OcrEditorComponent } from 'src/app/components/ocr-editor/ocr-editor.component';
import { ViewerComponent } from 'src/app/components/viewer/viewer.component';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Storage } from 'src/app/shared/constants';
import { SearchResults } from 'src/app/shared/search-results';
import {
  AltoVersion,
  AltoVersionContent,
  AltoVersionState,
} from 'src/app/shared/alto-version';

@Component({
  selector: 'app-revision-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AngularSplitModule,
    MatButtonToggleModule,
    TranslateModule,
    RouterModule,
    OcrEditorComponent,
    ViewerComponent,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    HighlightModule,
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
    private route: ActivatedRoute,
    private router: Router,
    private config: AppConfiguration,
    private service: AppService,
    public state: AppState,
  ) {}

  ngOnInit() {
    this.hor_size = localStorage.getItem(Storage.REVIZE_SIZE_HOR)
      ? parseInt(localStorage.getItem(Storage.REVIZE_SIZE_HOR))
      : 50;

    this.top_left_size = localStorage.getItem(Storage.REVIZE_SIZE_TOP_LEFT)
      ? parseInt(localStorage.getItem(Storage.REVIZE_SIZE_TOP_LEFT))
      : 50;

    this.bottom_left_size = localStorage.getItem(
      Storage.REVIZE_SIZE_BOTTOM_LEFT,
    )
      ? parseInt(localStorage.getItem(Storage.REVIZE_SIZE_BOTTOM_LEFT))
      : 50;

    this.route.params.subscribe((params) => {
      this.pid = params['pid'];
      this.version = params['version'];
      this.getVersions();
      if (this.version) {
        this.getSelectedVersion();
      }
      this.getActiveVersion();
    });
  }

  asDragEndHor(e: any) {
    localStorage.setItem(Storage.REVIZE_SIZE_HOR, String(e.sizes[0]));
  }

  asDragEndTop(e: any) {
    localStorage.setItem(Storage.REVIZE_SIZE_TOP_LEFT, String(e.sizes[0]));
  }

  asDragEndBottom(e: any) {
    localStorage.setItem(Storage.REVIZE_SIZE_BOTTOM_LEFT, String(e.sizes[0]));
    this.viewerWidth = e.sizes[0];
  }

  getVersions() {
    this.service
      .searchAltoVersions({
        targetPid: this.pid,
      })
      .subscribe((res: SearchResults<AltoVersion>) => {
        this.versions = res.items ?? [];
        if (this.versions.length && this.version == null) {
          this.version = this.versions[this.versions.length - 1].version;
          this.getSelectedVersion();
        }
      });
  }

  getSelectedVersion() {
    if (this.pid == null || this.version == null) return;
    this.service
      .fetchAltoVersion(this.pid, this.version)
      .subscribe((res: AltoVersionContent) => {
        this.selectedVersion = res;
        this.selectedVersionAlto = prettifyXml(base64ToUtf8(res.content));
        this.selectedVersionOcr = this.state.setPrintSpace(
          xml2js(this.selectedVersionAlto),
        );
        // Sync to state so editing, setArea and viewer selection use the same data
        this.state.altoXml = this.selectedVersionAlto;
        this.state.alto = xml2js(this.selectedVersionAlto);
        this.state.printSpace = this.selectedVersionOcr;
        this.state.clearSelection();
      });
  }

  getActiveVersion() {
    this.service
      .fetchActiveAltoVersion(this.pid)
      .subscribe((res: AltoVersionContent) => {
        this.activeVersion = res;
        this.activeVersionAlto = prettifyXml(base64ToUtf8(res.content));
        this.activeVersionOcr = this.state.setPrintSpace(
          xml2js(this.activeVersionAlto),
        );
      });
  }

  selectVersion(version: number) {
    this.version = version;
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
          err?.error?.errors?.[0] ?? 'desc.error',
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
      },
      error: (err) =>
        this.service.showSnackBar(
          err?.error?.errors?.[0] ?? 'desc.error',
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
      },
      error: (err) =>
        this.service.showSnackBar(
          err?.error?.errors?.[0] ?? 'desc.error',
          true,
        ),
    });
  }

  /** Save current edits of the selected version (same as editing page). */
  save() {
    if (!this.pid || !this.state.alto) return;
    const altoContent = utf8ToBase64(js2xml(this.state.alto));
    this.service.saveAltoVersion(this.pid, altoContent).subscribe({
      next: (res: any) => {
        this.service.showSnackBar(
          res?.content ? res.content : 'desc.savedSuccess',
        );
        this.state.clearSelection();
        this.getSelectedVersion();
        this.getVersions();
      },
      error: (err) =>
        this.service.showSnackBar(
          err?.error?.errors?.[0] ?? 'desc.error',
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
    // console.log(getVisibleAreaSizes())
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
}
