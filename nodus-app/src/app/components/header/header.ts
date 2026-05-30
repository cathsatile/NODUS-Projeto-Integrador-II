import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { NetworkStatusService } from '../../core/services/network-status.service';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly networkStatus = inject(NetworkStatusService);

  readonly iniciaisPsicologo = computed(() => {
    const psi = this.authService.psicologoAtual();
    if (!psi) return '';
    return psi.nome
      .split(' ')
      .filter(p => p.length > 0)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  });

  irParaPerfil(): void {
    this.router.navigate(['/principal/psicologo-profile']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
