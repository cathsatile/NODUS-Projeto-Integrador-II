import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Principal } from './pages/principal.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'principal',
        component: Principal,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                loadChildren: () => import('./pages/principal.routes').then(m => m.principalRoutes)
            }
        ]
    },
    { path: 'login', component: Login },
    { path: '**', redirectTo: 'login' }
];
