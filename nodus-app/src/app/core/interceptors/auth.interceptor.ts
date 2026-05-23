import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  const reqAutenticado = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(reqAutenticado).pipe(
    catchError((erro: HttpErrorResponse) => {
      // não redireciona em rotas de auth para não interferir nos handlers do componente de login
      const isRotaAuth = req.url.includes('/api/auth');
      if (erro.status === 401 && !isRotaAuth) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => erro);
    })
  );
};
