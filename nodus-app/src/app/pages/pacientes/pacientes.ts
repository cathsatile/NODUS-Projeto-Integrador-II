import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';

@Component({
  selector: 'app-pacientes',
  imports: [DatePipe],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.scss',
})
export class Pacientes implements OnInit {
  private authService = inject(AuthService);
  protected pacienteService = inject(PacienteService);

  readonly numPacientes = computed(() => this.pacienteService.pacientes().length);

  ngOnInit(): void {
    const psi = this.authService.psicologoAtual();
    if (!psi) return;
    this.pacienteService.getByPsicologo(psi.id_psicologo).subscribe();
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
