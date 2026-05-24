import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-psicologo-profile',
  imports: [],
  templateUrl: './psicologo-profile.html',
  styleUrl: './psicologo-profile.scss',
})
export class PsicologoProfile {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly psicologo = this.authService.psicologoAtual;

  readonly iniciais = computed(() => {
    const psi = this.psicologo();
    if (!psi) return '';
    return psi.nome
      .split(' ')
      .filter(p => p.length > 0)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  });

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
