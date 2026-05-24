import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { AddSectionPaciente } from '../../components/add-section-paciente/add-section-paciente';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { SessaoService } from '../../core/services/sessao.service';

Chart.register(...registerables);

const HUMOR_EMOJI: Record<number, string> = { 1: '😢', 2: '😟', 3: '😐', 4: '😊', 5: '😆' };

@Component({
  selector: 'app-home-page',
  imports: [MatDialogModule, DatePipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  private pacienteService = inject(PacienteService);
  private sessaoService = inject(SessaoService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  @ViewChild('canvasHumor') canvasRef!: ElementRef<HTMLCanvasElement>;
  private grafico?: Chart;

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

  // Últimas 15 sessões com humor registrado, ordenadas do mais antigo ao mais recente
  readonly dadosGrafico = computed(() => {
    const sessoes = this.sessaoService.sessoes()
      .filter(s => s.humor != null)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      .slice(-15);

    return {
      labels: sessoes.map(s => {
        const d = new Date(s.data);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      }),
      valores: sessoes.map(s => s.humor!),
    };
  });

  readonly temDadosHumor = computed(() => this.dadosGrafico().valores.length > 0);

  constructor() {
    // Atualiza o gráfico reativamente sempre que os dados mudarem
    effect(() => {
      const dados = this.dadosGrafico();
      if (!this.grafico) return;
      this.grafico.data.labels = dados.labels;
      this.grafico.data.datasets[0].data = dados.valores;
      this.grafico.update('none');
    });
  }

  ngOnInit(): void {
    const psi = this.authService.psicologoAtual();
    if (!psi) return;
    this.pacienteService.getByPsicologo(psi.id_psicologo).subscribe();
    this.sessaoService.getByPsicologo(psi.id_psicologo).subscribe();
  }

  ngAfterViewInit(): void {
    const dados = this.dadosGrafico();
    this.grafico = new Chart(this.canvasRef.nativeElement, {
      type: 'line',
      data: {
        labels: dados.labels,
        datasets: [{
          data: dados.valores,
          borderColor: '#c3334b',
          backgroundColor: 'rgba(195, 51, 75, 0.08)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#c3334b',
          pointRadius: 5,
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => HUMOR_EMOJI[ctx.parsed.y as number] ?? String(ctx.parsed.y),
            },
          },
        },
        scales: {
          y: {
            min: 1,
            max: 5,
            ticks: {
              stepSize: 1,
              callback: val => HUMOR_EMOJI[val as number] ?? '',
            },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          x: {
            grid: { display: false },
          },
        },
      },
    });
  }

  ngOnDestroy(): void {
    this.grafico?.destroy();
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
