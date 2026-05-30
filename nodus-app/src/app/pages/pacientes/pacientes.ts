import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { AddSectionPaciente } from '../../components/add-section-paciente/add-section-paciente';

@Component({
  selector: 'app-pacientes',
  imports: [DatePipe, MatDialogModule],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.scss',
})
export class Pacientes implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  protected pacienteService = inject(PacienteService);

  readonly numPacientes = computed(() => this.pacienteService.pacientes().length);

  ngOnInit(): void {
    const psi = this.authService.psicologoAtual();
    if (!psi) return;
    this.pacienteService.getByPsicologo(psi.id_psicologo).subscribe();
  }

  openModal(): void {
    this.dialog.open(AddSectionPaciente, {
      data: { add: 'paciente' },
      width: 'auto',
      maxWidth: '95vw',
      position: { bottom: '0' },
      panelClass: 'bottom-modal',
    });
  }

  verPaciente(id: number | undefined): void {
    if (id == null) return;
    this.router.navigate(['/principal/info-paciente', id]);
  }

  iniciaisDe(nome: string): string {
    return nome
      .split(' ')
      .filter(p => p.length > 0)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }
}
