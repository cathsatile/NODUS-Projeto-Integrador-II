import { CommonModule } from '@angular/common';
import { Component, Inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-add-section-paciente',
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule],
  templateUrl: './add-section-paciente.html',
  styleUrl: './add-section-paciente.scss'
})
export class AddSectionPaciente {
  pacienteList = [
    {
      id: 2,
      nome: 'Joana'
    }
  ];
  pacienteSelecionado: any;
  humorSelecionado: any;

  constructor(
  @Inject(MAT_DIALOG_DATA) public data: any
) {}

  onInit(){

  }

  salvarSessao(){

  }

  salvarPaciente(){

  }
}
