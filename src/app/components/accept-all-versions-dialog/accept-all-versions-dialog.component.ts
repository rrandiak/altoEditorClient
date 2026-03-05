import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { TranslateModule } from '@ngx-translate/core';
import { BatchPriority } from 'src/app/shared/batch';
import { AltoVersionState } from 'src/app/shared/alto-version';
import { TranslateService } from '@ngx-translate/core';

export interface AcceptAllVersionsDialogData {
  /** no extra data needed */
}

export interface AcceptAllVersionsDialogResult {
  state: AltoVersionState.ACTIVE | AltoVersionState.PENDING;
  priority: BatchPriority;
}

@Component({
  selector: 'app-accept-all-versions-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    TranslateModule,
  ],
  templateUrl: './accept-all-versions-dialog.component.html',
  styleUrls: ['./accept-all-versions-dialog.component.scss'],
})
export class AcceptAllVersionsDialogComponent {
  readonly AltoVersionState = AltoVersionState;
  priorities: BatchPriority[] = Object.values(BatchPriority);
  selectedState: AltoVersionState.ACTIVE | AltoVersionState.PENDING =
    AltoVersionState.PENDING;
  selectedPriority: BatchPriority = BatchPriority.MEDIUM;

  constructor(
    public dialogRef: MatDialogRef<
      AcceptAllVersionsDialogComponent,
      AcceptAllVersionsDialogResult | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: AcceptAllVersionsDialogData,
    private translate: TranslateService,
  ) {}

  get stateLabel(): string {
    return this.translate.instant(`versionState.${this.selectedState}`);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close({
      state: this.selectedState,
      priority: this.selectedPriority,
    });
  }
}
