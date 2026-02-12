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
import { UserInfo } from 'src/app/shared/user-info';
import { BatchPriority } from 'src/app/shared/batch';

export interface GeneratePriorityDialogData {
  engine: UserInfo;
  priorities: string[];
}

export interface GeneratePriorityDialogResult {
  priority: string;
}

@Component({
  selector: 'app-generate-priority-dialog',
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
  templateUrl: './generate-priority-dialog.component.html',
  styleUrls: ['./generate-priority-dialog.component.scss'],
})
export class GeneratePriorityDialogComponent {
  selectedPriority: BatchPriority;

  constructor(
    public dialogRef: MatDialogRef<
      GeneratePriorityDialogComponent,
      GeneratePriorityDialogResult | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: GeneratePriorityDialogData,
  ) {
    this.selectedPriority = BatchPriority.MEDIUM;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onGenerate(): void {
    if (this.selectedPriority) {
      this.dialogRef.close({ priority: this.selectedPriority });
    }
  }
}
