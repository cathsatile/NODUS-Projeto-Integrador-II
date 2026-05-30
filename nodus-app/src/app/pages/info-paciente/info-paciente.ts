import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { SessaoService } from '../../core/services/sessao.service';

const HUMOR_LABEL: Record<number, string> = { 1: '😢 Muito Mal', 2: '😟 Mal', 3: '😐 Neutro', 4: '😊 Bem', 5: '😆 Muito Bem' };

@Component({
  selector: 'app-info-paciente',
  imports: [DatePipe],
  templateUrl: './info-paciente.html',
  styleUrl: './info-paciente.scss',
})
export class InfoPaciente implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private pacienteService = inject(PacienteService);
  private sessaoService = inject(SessaoService);

  readonly pacienteId = signal<number | null>(null);

  readonly paciente = computed(() => {
    const id = this.pacienteId();
    if (id === null) return null;
    return this.pacienteService.pacientes().find(p => p.id_paciente === id) ?? null;
  });

  readonly sessoesPaciente = computed(() => {
    const id = this.pacienteId();
    if (id === null) return [];
    return this.sessaoService.sessoes()
      .filter(s => s.id_paciente === id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  });

  readonly iniciais = computed(() => {
    const p = this.paciente();
    if (!p) return '';
    return p.nome.split(' ').filter(w => w.length > 0).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  });

  humorLabel(humor: number | undefined): string {
    if (humor == null) return '—';
    return HUMOR_LABEL[humor] ?? String(humor);
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.pacienteId.set(id);
    const psi = this.authService.psicologoAtual();
    if (!psi) return;
    if (this.pacienteService.pacientes().length === 0) {
      this.pacienteService.getByPsicologo(psi.id_psicologo).subscribe();
    }
    this.sessaoService.getByPsicologo(psi.id_psicologo).subscribe();
  }

  voltar(): void {
    this.router.navigate(['/principal/pacientes']);
  }
}
