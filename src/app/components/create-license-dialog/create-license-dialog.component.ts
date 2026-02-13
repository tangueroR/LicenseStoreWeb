import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ProductType, SicoAnlage } from '../../models/sico-anlage.model';

export interface CreateLicenseDialogData {
  product: ProductType;
  userName: string;
  selectedRow: SicoAnlage | null;
}

export interface CreateLicenseDialogResult {
  neuronId: string;
  projectName: string;
  description: string;
  version: string;
  isPremium: boolean;
  hasLicence: boolean;
  wireguardAddress: string;
  ipAddress: string;
}

@Component({
  selector: 'app-create-license-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule
  ],
  templateUrl: './create-license-dialog.component.html',
  styleUrl: './create-license-dialog.component.scss'
})
export class CreateLicenseDialogComponent {
  neuronId = '';
  projectName = '';
  description = '';
  version = '';
  isPremium = false;
  hasLicence = true;
  wireguardAddress = '';
  ipAddress = '';

  constructor(
    private readonly dialogRef: MatDialogRef<CreateLicenseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateLicenseDialogData
  ) {
    // Pre-fill from selected row if available
    if (data.selectedRow) {
      const row = data.selectedRow;
      this.neuronId = row.neuronId ?? '';
      this.projectName = row.projectName ?? '';
      this.description = row.description ?? '';
      this.version = row.password5 ?? '';
      this.isPremium = row.isPassword3 ?? false;
      this.hasLicence = row.hasLicense ?? true;
      if (this.isNetworkProduct) {
        this.ipAddress = row.modemPassword ?? '';
        this.wireguardAddress = row.password3 ?? '';
      }
    }
  }

  get productLabel(): string {
    switch (this.data.product) {
      case 'sico1010': return 'Sico1010';
      case 'sico2020': return 'Sico2020';
      case 'sico5000': return 'Sico5000';
      case 'sico6000': return 'Sico6000';
    }
  }

  get isNetworkProduct(): boolean {
    return this.data.product === 'sico2020' || this.data.product === 'sico6000';
  }

  get isValid(): boolean {
    return this.neuronId.trim().length > 0 && this.projectName.trim().length > 0;
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onCreate(): void {
    if (!this.isValid) return;

    const result: CreateLicenseDialogResult = {
      neuronId: this.neuronId.trim(),
      projectName: this.projectName.trim(),
      description: this.description.trim(),
      version: this.version.trim(),
      isPremium: this.isPremium,
      hasLicence: this.hasLicence,
      wireguardAddress: this.wireguardAddress.trim(),
      ipAddress: this.ipAddress.trim()
    };
    this.dialogRef.close(result);
  }
}
