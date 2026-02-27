import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { XmlJsElement } from 'src/app/shared/xml-js-element';
import { FormsModule } from '@angular/forms';
import { AppState } from 'src/app/shared/app.state';
import { MatTooltipModule } from '@angular/material/tooltip';
import { getElementByPos } from 'src/app/shared/utils';

@Component({
  selector: 'app-ocr-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTooltipModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
  ],
  templateUrl: './ocr-editor.component.html',
  styleUrls: ['./ocr-editor.component.scss'],
})
export class OcrEditorComponent {
  @Input() canEdit: boolean;
  @Input() selectedWords: XmlJsElement[] = [];
  @Output() setArea = new EventEmitter<any>();
  @Input() divZoom = 1;

  _printSpace: XmlJsElement;
  @Input() set printSpace(value: XmlJsElement) {
    this._printSpace = value;
    this.checkDiffs();
  }

  _printSpaceDiff: XmlJsElement;
  @Input() set printSpaceDiff(value: XmlJsElement) {
    this._printSpaceDiff = value;
    this.checkDiffs();
  }

  diffs: { [key: string]: string } = {}; // key is 'HPOS-VPOS', value is CONTENT

  constructor(public state: AppState) {}

  onSetArea(blockIdx: number, lineIdx: number, wordIdx: number) {
    if (this.canEdit) {
      this.setArea.emit({ blockIdx, lineIdx, wordIdx });
    }
  }

  checkDiffs() {
    this.diffs = {};
    if (this._printSpaceDiff) {
      this._printSpace.elements.forEach((tb: XmlJsElement) => {
        if (!tb.elements) {
          return;
        }
        tb.elements.forEach((line: XmlJsElement, idx: number) => {
          if (!line.elements) {
            return;
          }
          line.idx = idx;
          line.elements.forEach((word: XmlJsElement) => {
            if (
              !word.attributes ||
              !word.attributes['HPOS'] ||
              !word.attributes['VPOS']
            ) {
              return;
            }
            const d = getElementByPos(
              this._printSpaceDiff,
              word.attributes['HPOS'],
              word.attributes['VPOS'],
            );
            if (d && d.attributes['CONTENT'] !== word.attributes['CONTENT']) {
              const key =
                word.attributes['HPOS'] + '-' + word.attributes['VPOS'];
              this.diffs[key] = d.attributes['CONTENT'];
            }
          });
        });
      });
    }
  }
}
