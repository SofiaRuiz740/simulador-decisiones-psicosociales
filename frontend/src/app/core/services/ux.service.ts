import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../shared/dialogs/confirm-dialog';
import {
  InputDialog,
  InputDialogData,
} from '../../shared/dialogs/input-dialog';

/**
 * UX helpers para reemplazar `confirm()` y `prompt()` nativos del navegador
 * por dialogs Material coherentes con la identidad visual del sistema.
 */
@Injectable({ providedIn: 'root' })
export class UxService {
  private readonly dialog = inject(MatDialog);

  /**
   * Abre un dialog de confirmación. Devuelve true si el usuario confirma.
   *
   * Reemplaza `confirm("¿seguro?")`.
   */
  confirm(data: ConfirmDialogData): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialog, {
      data,
      width: '440px',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      panelClass: 'app-dialog',
    });
    return firstValueFrom(ref.afterClosed()).then((r) => r === true);
  }

  /**
   * Abre un dialog para capturar un texto del usuario.
   * Devuelve el string ingresado o `null` si canceló.
   *
   * Reemplaza `prompt("Texto:")`.
   */
  askInput(data: InputDialogData): Promise<string | null> {
    const ref = this.dialog.open(InputDialog, {
      data,
      width: '460px',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      panelClass: 'app-dialog',
    });
    return firstValueFrom(ref.afterClosed()).then((r) => (r ?? null) as string | null);
  }
}
