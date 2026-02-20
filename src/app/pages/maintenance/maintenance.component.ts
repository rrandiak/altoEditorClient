import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { AppService } from 'src/app/app.service';
import { PlanProcessDialogComponent } from 'src/app/components/plan-process-dialog/plan-process-dialog.component';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './maintenance.component.html',
  styleUrls: ['./maintenance.component.scss'],
})
export class MaintenanceComponent {
  constructor(
    private service: AppService,
    private dialog: MatDialog,
  ) {}

  openReindexDialog(): void {
    this.dialog
      .open(PlanProcessDialogComponent, {
        data: { title: 'actionTitle.reindex' },
        width: '320px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.priority) {
          this.service.planReindex(result.priority).subscribe({
            next: () =>
              this.service.showSnackBar('message.reindexPlanned', false),
            error: (err) =>
              this.service.showSnackBar(
                err?.error?.message || 'message.error',
                true,
              ),
          });
        }
      });
  }
}
