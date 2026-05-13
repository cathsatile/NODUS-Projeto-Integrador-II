import { Component } from '@angular/core';
import { AddSectionPaciente } from '../../components/add-section-paciente/add-section-paciente';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [AddSectionPaciente, MatDialogModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  psiNome = 'DR. Fulano';
  sessaoHoje = 'Nenhuma sessão hoje';
  numPacientes = 3;
  numSessoesMes = 10;
  popupAberto = false;


  constructor(private dialog: MatDialog,
    private router: Router
  ) { }

  goToSections() {
    this.router.navigate(['/principal/sections']);
  }

  openModal(modal: string): void {

    this.dialog.open(AddSectionPaciente, {

      data: {
        add: modal
      },

      width: 'auto',
      maxWidth: '95vw',

      position: {
        bottom: '0'
      },

      panelClass: 'bottom-modal'
    });

  }
}
