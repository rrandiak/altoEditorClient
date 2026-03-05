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
import {
  BatchPriority,
  HierarchyGenerateScope,
} from 'src/app/shared/batch';

export interface GenerateForHierarchyDialogData {
  title: string;
  titleParams?: Record<string, string>;
}

export interface GenerateForHierarchyDialogResult {
  priority: BatchPriority;
  scope: HierarchyGenerateScope;
}

@Component({
  selector: 'app-generate-for-hierarchy-dialog',
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
  templateUrl: './generate-for-hierarchy-dialog.component.html',
  styleUrls: ['./generate-for-hierarchy-dialog.component.scss'],
})
export class GenerateForHierarchyDialogComponent {
  readonly HierarchyGenerateScope = HierarchyGenerateScope;
  scopes: HierarchyGenerateScope[] = Object.values(HierarchyGenerateScope);
  priorities: BatchPriority[] = Object.values(BatchPriority);
  selectedPriority: BatchPriority = BatchPriority.MEDIUM;
  selectedScope: HierarchyGenerateScope = HierarchyGenerateScope.ALL;

  constructor(
    public dialogRef: MatDialogRef<
      GenerateForHierarchyDialogComponent,
      GenerateForHierarchyDialogResult | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: GenerateForHierarchyDialogData,
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close({
      priority: this.selectedPriority,
      scope: this.selectedScope,
    });
  }
}
