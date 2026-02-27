import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularSplitModule } from 'angular-split';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { ViewerComponent } from 'src/app/components/viewer/viewer.component';
import { AppService } from 'src/app/app.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AppConfiguration } from 'src/app/app-configuration';
import { FormsModule } from '@angular/forms';
import { AppState } from 'src/app/shared/app.state';
import { XmlJsElement } from 'src/app/shared/xml-js-element';
import { base64ToUtf8, prettifyXml, utf8ToBase64 } from 'src/app/shared/utils';

import { js2xml, xml2js } from 'xml-js';
import { OcrEditorComponent } from 'src/app/components/ocr-editor/ocr-editor.component';
import { HighlightModule } from 'ngx-highlightjs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import {
  PlanProcessDialogComponent,
  PlanProcessDialogData,
} from 'src/app/components/plan-process-dialog/plan-process-dialog.component';
import { UserInfo } from 'src/app/shared/user-info';
import { BatchPriority } from 'src/app/shared/batch';

@Component({
  selector: 'app-editing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AngularSplitModule,
    MatMenuModule,
    MatButtonToggleModule,
    HighlightModule,
    MatTooltipModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
    ViewerComponent,
    OcrEditorComponent,
  ],
  templateUrl: './editing.component.html',
  styleUrls: ['./editing.component.scss'],
})
export class EditingComponent implements OnInit {
  @ViewChild('scroller') scroller: ElementRef;

  currentPage: number;
  viewerWidth: number;

  selection: DOMRect;
  selectedText: string;

  pid: string;

  priorities: string[];

  panelMode = 'ocr';
  divZoom = 1;
  imgW = 100;

  constructor(
    public dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private config: AppConfiguration,
    private service: AppService,
    public state: AppState,
  ) {}

  ngOnInit() {
    this.priorities = Object.values(BatchPriority);
    this.route.paramMap.subscribe((params: any) => {
      this.pid = params.get('pid');

      if (!this.pid) {
        this.service.showSnackBar('desc.pidNotFound', true);
        return;
      }

      if (this.pid != this.state.currentAltoVersion?.pid) {
        this.loadAltoVersion();
      }
    });
  }

  loadAltoVersion() {
    this.service
      .fetchRelatedAltoVersion(this.pid, this.config.instance)
      .subscribe({
        next: (version) => {
          this.state.currentAltoVersion = version;
          this.loadAltoContent(version.content);
        },
        error: (err) => {
          const status = err?.status;
          const message = err?.error?.message ?? err?.message;
          if (status === 400) {
            this.service.showSnackBar(message || 'desc.badRequest', true);
          } else if (status === 404) {
            this.router.navigate(['/document-hierarchy'], {
              queryParams: { pid: this.pid },
            });
          } else {
            this.service.showSnackBar(message || 'message.error', true);
          }
        },
      });
  }

  /** ALTO Page WIDTH/HEIGHT for coordinate scaling. */
  getAltoPageBounds(): { width: number; height: number } | null {
    return this.state.getAltoPageBounds(this.state.alto);
  }

  private loadAltoContent(binaryContent: string) {
    const altoXml = base64ToUtf8(binaryContent);
    this.state.altoXml = prettifyXml(altoXml);
    this.state.alto = xml2js(altoXml);
    this.state.printSpace = this.state.setPrintSpace(this.state.alto);
  }

  /**
   * Add id to all alto elements
   */
  addIdx() {
    this.state.printSpace.elements.forEach((tb: XmlJsElement) => {
      tb.elements.forEach((line: XmlJsElement, idx: number) => {
        line.idx = idx;
        line.elements.forEach((word: XmlJsElement, widx: number) => {
          word.idx = widx;
          word.attributes['POSID'] =
            word.attributes['HPOS'] + '-' + word.attributes['VPOS'];
        });
      });
    });
  }

  setSelectedArea(t: any) {
    this.selection = t;
    const tBlocks: XmlJsElement[] = this.state.printSpace.elements;

    this.state.clearSelection();

    this.state.selectedBlocks = tBlocks.filter((tb: XmlJsElement) => {
      return this.intersectRect(
        this.selection,
        DOMRect.fromRect({
          x: parseInt(tb.attributes['HPOS']),
          y: parseInt(tb.attributes['VPOS']),
          width: parseInt(tb.attributes['WIDTH']),
          height: parseInt(tb.attributes['HEIGHT']),
        }),
      );
    });

    this.state.selectedBlocks.forEach((tb: XmlJsElement) => {
      const tlines = tb.elements;
      if (tlines) {
        tlines.forEach((line: XmlJsElement, idx: number) => {
          //line.idx = idx;
          if (
            this.intersectRect(
              this.selection,
              DOMRect.fromRect({
                x: parseInt(line.attributes['HPOS']),
                y: parseInt(line.attributes['VPOS']),
                width: parseInt(line.attributes['WIDTH']),
                height: parseInt(line.attributes['HEIGHT']),
              }),
            )
          ) {
            //console.log(idx);
            this.state.selectedLines.push(line);
            line.elements.forEach((word: XmlJsElement, widx: number) => {
              //word.idx = widx;
              if (
                this.intersectRect(
                  this.selection,
                  DOMRect.fromRect({
                    x: parseInt(word.attributes['HPOS']),
                    y: parseInt(word.attributes['VPOS']),
                    width: parseInt(word.attributes['WIDTH']),
                    height: parseInt(word.attributes['HEIGHT']),
                    // x: word.$.HPOS, y: word.$.VPOS, width: word.$.WIDTH, height: word.$.HEIGHT
                  }),
                )
              ) {
                //console.log(idx);
                this.state.selectedWords.push(word);
              }
            });
          }
        });
      }
    });

    this.state.selectedAlto = {
      blocks: this.state.selectedBlocks,
      lines: this.state.selectedLines,
      words: this.state.selectedWords,
    };
  }

  intersectRect(r1: DOMRect, r2: DOMRect) {
    return !(
      r2.left >= r1.right ||
      r2.right <= r1.left ||
      r2.top >= r1.bottom ||
      r2.bottom <= r1.top
    );
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

  save() {
    const altoContent = utf8ToBase64(js2xml(this.state.alto));
    this.service.saveAltoVersion(this.pid, altoContent).subscribe({
      next: (res) => {
        this.service.showSnackBar('message.altoVersionSaved');
      },
    });
  }

  openGeneratePriorityDialog(engine: UserInfo): void {
    const data: PlanProcessDialogData = {
      title: 'actionTitle.generateSinglePageAlto',
      titleParams: { engine: engine.username },
    };
    const ref = this.dialog.open(PlanProcessDialogComponent, {
      data,
      width: '320px',
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.priority) {
        this.generateWithEngine(engine, result.priority);
      }
    });
  }

  generateWithEngine(engine: UserInfo, priority: BatchPriority): void {
    this.service
      .generateAlto(this.pid, engine.username, priority, this.config.instance)
      .subscribe({
        next: () => {
          this.service.showSnackBar('message.altoVersionGenerationPlanned');
        },
        error: (err) => {
          this.service.showSnackBar(err.error.message, true);
        },
      });
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
}
