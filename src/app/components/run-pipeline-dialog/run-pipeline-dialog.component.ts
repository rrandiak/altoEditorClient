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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslateModule } from '@ngx-translate/core';
import {
  BatchPriority,
  HierarchyGenerateScope,
  PipelineStage,
} from 'src/app/shared/batch';

export interface RunPipelineDialogData {
  title: string;
  titleParams?: Record<string, string>;
}

export interface RunPipelineDialogResult {
  stages: PipelineStage[];
  scope: HierarchyGenerateScope;
  priority: BatchPriority;
}

/**
 * Configure a load-generate-accept pipeline: which stages to run (Accept off by
 * default — it writes to Kramerius), the generate scope, and the priority. The engine
 * is chosen from the menu that opens this dialog, so it is not selected here.
 */
@Component({
  selector: 'app-run-pipeline-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    TranslateModule,
  ],
  templateUrl: './run-pipeline-dialog.component.html',
  styleUrls: ['./run-pipeline-dialog.component.scss'],
})
export class RunPipelineDialogComponent {
  readonly PipelineStage = PipelineStage;
  scopes: HierarchyGenerateScope[] = Object.values(HierarchyGenerateScope);
  priorities: BatchPriority[] = Object.values(BatchPriority);

  // Accept defaults off — the curator opts in explicitly since it uploads to Kramerius.
  stageSelection: Record<PipelineStage, boolean> = {
    [PipelineStage.RETRIEVE]: true,
    [PipelineStage.GENERATE]: true,
    [PipelineStage.ACCEPT]: false,
  };
  selectedScope: HierarchyGenerateScope = HierarchyGenerateScope.ALL;
  selectedPriority: BatchPriority = BatchPriority.MEDIUM;

  constructor(
    public dialogRef: MatDialogRef<
      RunPipelineDialogComponent,
      RunPipelineDialogResult | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: RunPipelineDialogData,
  ) {}

  get selectedStages(): PipelineStage[] {
    // Keep canonical order regardless of checkbox order.
    return [
      PipelineStage.RETRIEVE,
      PipelineStage.GENERATE,
      PipelineStage.ACCEPT,
    ].filter((s) => this.stageSelection[s]);
  }

  get generateSelected(): boolean {
    return this.stageSelection[PipelineStage.GENERATE];
  }

  get canConfirm(): boolean {
    return this.selectedStages.length > 0;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (!this.canConfirm) {
      return;
    }
    this.dialogRef.close({
      stages: this.selectedStages,
      scope: this.selectedScope,
      priority: this.selectedPriority,
    });
  }
}
