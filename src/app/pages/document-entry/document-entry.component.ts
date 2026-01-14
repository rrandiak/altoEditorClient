import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';
import { AppService } from 'src/app/app.service';
import { KrameriusDocument } from 'src/app/shared/kramerius-document';

@Component({
  selector: 'app-document-entry',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    TranslateModule,
  ],
  templateUrl: './document-entry.component.html',
  styleUrls: ['./document-entry.component.scss'],
})
export class DocumentEntryComponent implements OnInit {
  pid: string = '';
  document: KrameriusDocument | null = null;

  constructor(private service: AppService) {}

  ngOnInit(): void {}

  loadDocument() {
    if (!this.pid) return;

    // Reset previous state
    this.document = null;

    // Fetch document
    this.service.findKrameriusObject(this.pid, '').subscribe((doc: any) => {
      if (doc) {
        this.document = doc;
      } else {
        this.service.showSnackBar('msg.documentEntry.notFound', true);
      }
    });
  }

  addAllPages() {
    if (!this.pid) return;

    this.service.addAllPages(this.pid, '').subscribe({
      next: (response) => {
        this.service.showSnackBar('msg.documentEntry.addSuccess');

        this.document = null;
        this.pid = '';
      },
      error: (error) => {
        this.service.showSnackBar('msg.documentEntry.addError', true);
      },
    });
  }

  pluralKey(base: string, count: number): string {
    if (count === 1) return `${base}_one`;
    if (count >= 2 && count <= 4) return `${base}_few`;
    return `${base}_many`;
  }
}
