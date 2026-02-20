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
import { TranslateModule } from '@ngx-translate/core';
import { BatchPriority } from 'src/app/shared/batch';

export interface PlanProcessDialogData {
  /** Dialog title - translation key (e.g. 'maintenance.reindex') or interpolated key with params */
  title: string;
  /** Optional params for title interpolation, e.g. { engine: 'pero' } for 'desc.generateWith' */
  titleParams?: Record<string, string>;
}

export interface PlanProcessDialogResult {
  priority: BatchPriority;
}

@Component({
  selector: 'app-plan-process-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslateModule,
  ],
  templateUrl: './plan-process-dialog.component.html',
  styleUrls: ['./plan-process-dialog.component.scss'],
})
export class PlanProcessDialogComponent {
  priorities: BatchPriority[] = Object.values(BatchPriority);
  selectedPriority: BatchPriority;

  constructor(
    public dialogRef: MatDialogRef<
      PlanProcessDialogComponent,
      PlanProcessDialogResult | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: PlanProcessDialogData,
  ) {
    this.selectedPriority = BatchPriority.MEDIUM;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.selectedPriority) {
      this.dialogRef.close({ priority: this.selectedPriority });
    }
  }
}
