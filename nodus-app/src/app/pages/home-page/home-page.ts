import { Component, computed, inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AddSectionPaciente } from '../../components/add-section-paciente/add-section-paciente';
import { AuthService } from '../../core/auth/auth.service';
import { emocaoEmoji, emocaoLabel, statusLabel, STATUS_SESSAO } from '../../core/services/emocoes';
import { Sessao } from '../../core/services/sessao.model';
import { PacienteService } from '../../core/services/paciente.service';
import { SessaoService } from '../../core/services/sessao.service';

@Component({
  selector: 'app-home-page',
  imports: [MatDialogModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit {
  private authService = inject(AuthService);
  private pacienteService = inject(PacienteService);
  private sessaoService = inject(SessaoService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  readonly STATUS_SESSAO = STATUS_SESSAO;
  readonly statusLabel = statusLabel;

  readonly psiNome = computed(() => this.authService.psicologoAtual()?.nome ?? '');
  readonly numPacientes = computed(() => this.pacienteService.pacientes().length);

  readonly numSessoesMes = computed(() => {
    const agora = new Date();
    return this.sessaoService.sessoes().filter(s => {
      const d = new Date(s.data);
      return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    }).length;
  });

  readonly sessoesHoje = computed(() => {
    const hoje = new Date().toDateString();
    const pacientes = this.pacienteService.pacientes();
    return this.sessaoService.sessoes()
      .filter(s => new Date(s.data).toDateString() === hoje)
      .sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? ''))
      .map(s => ({
        ...s,
        nomePaciente: pacientes.find(p => p.id_paciente === s.id_paciente)?.nome ?? 'Paciente',
      }));
  });

  readonly sessaoHoje = computed(() => {
    const count = this.sessoesHoje().length;
    if (count === 0) return 'Nenhuma sessão hoje';
    return count === 1 ? '1 sessão hoje' : `${count} sessões hoje`;
  });

  // Top-3 emoções mais presentes no último mês
  readonly top3Emocoes = computed(() => {
    const umMesAtras = new Date();
    umMesAtras.setMonth(umMesAtras.getMonth() - 1);

    const sessoesComHumor = this.sessaoService.sessoes()
      .filter(s => s.humor != null && new Date(s.data) >= umMesAtras);

    const total = sessoesComHumor.length;
    if (total === 0) return [];

    const contagem: Record<number, number> = {};
    for (const s of sessoesComHumor) {
      const h = s.humor!;
      contagem[h] = (contagem[h] ?? 0) + 1;
    }

    return Object.entries(contagem)
      .map(([valor, count]) => ({
        valor: Number(valor),
        count,
        percentual: Math.round((count / total) * 100),
        label: emocaoLabel(Number(valor)),
        emoji: emocaoEmoji(Number(valor)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  });

  readonly temDadosEmocao = computed(() => this.top3Emocoes().length > 0);

  ngOnInit(): void {
    const psi = this.authService.psicologoAtual();
    if (!psi) return;
    this.pacienteService.getByPsicologo(psi.id_psicologo).subscribe();
    this.sessaoService.getByPsicologo(psi.id_psicologo).subscribe();
  }

  sessaoJaAconteceu(data: string, horario: string | null | undefined): boolean {
    const dateStr = data.slice(0, 10);
    const timeStr = horario ?? '23:59';
    return new Date(`${dateStr}T${timeStr}:00`) <= new Date();
  }

  marcarStatus(id_sessao: number, status: string): void {
    this.sessaoService.update(id_sessao, { status } as Partial<Sessao>).subscribe();
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
