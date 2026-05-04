import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Principal } from './pages/principal.component';

export const routes: Routes = [
    {
        path: 'principal',
        component: Principal,
        children :[
            {
                path: '',
                loadChildren: () => import('./pages/principal.routes').then(m => m.PrincipalRoutes)
            }
        ]
    },
    {path: 'login', component: Login},
    {path: '**', redirectTo: 'principal'}
];
