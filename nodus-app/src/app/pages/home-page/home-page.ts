import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AddSectionPaciente } from '../../components/add-section-paciente/add-section-paciente';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { SessaoService } from '../../core/services/sessao.service';

@Component({
  selector: 'app-home-page',
  imports: [MatDialogModule, DatePipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit {
  private authService = inject(AuthService);
  private pacienteService = inject(PacienteService);
  private sessaoService = inject(SessaoService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  readonly psiNome = computed(() => this.authService.psicologoAtual()?.nome ?? '');

  readonly numPacientes = computed(() => this.pacienteService.pacientes().length);

  readonly numSessoesMes = computed(() => {
    const agora = new Date();
    return this.sessaoService.sessoes().filter(s => {
      const d = new Date(s.data);
      return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    }).length;
  });

  readonly sessaoHoje = computed(() => {
    const hoje = new Date();
    const count = this.sessaoService.sessoes().filter(s =>
      new Date(s.data).toDateString() === hoje.toDateString()
    ).length;
    if (count === 0) return 'Nenhuma sessão hoje';
    return count === 1 ? '1 sessão hoje' : `${count} sessões hoje`;
  });

  readonly proximasSessoes = computed(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const pacientes = this.pacienteService.pacientes();
    return this.sessaoService.sessoes()
      .filter(s => new Date(s.data) >= hoje)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .slice(0, 3)
      .map(s => ({
        ...s,
        nomePaciente: pacientes.find(p => p.id_paciente === s.id_paciente)?.nome ?? 'Paciente',
      }));
  });

  ngOnInit(): void {
    const psi = this.authService.psicologoAtual();
    if (!psi) return;
    this.pacienteService.getByPsicologo(psi.id_psicologo).subscribe();
    this.sessaoService.getByPsicologo(psi.id_psicologo).subscribe();
  }

  goToSections(): void {
    this.router.navigate(['/principal/sections']);
  }

  openModal(modal: string): void {
    this.dialog.open(AddSectionPaciente, {
      data: { add: modal },
      width: 'auto',
      maxWidth: '95vw',
      position: { bottom: '0' },
      panelClass: 'bottom-modal',
    });
  }
}
