import { MatDialogConfig } from '@angular/material/dialog';

/** Configuración estándar de diálogos alineados al mockup. */
export const MOCKUP_DIALOG: MatDialogConfig = {
  panelClass: 'mockup-dialog',
  width: '560px',
  autoFocus: 'first-tabbable',
};

export function mockupDialog(width = '560px'): MatDialogConfig {
  return { ...MOCKUP_DIALOG, width };
}
