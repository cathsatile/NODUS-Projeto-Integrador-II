import { Routes } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Header } from './components/header/header';
import { Login } from './pages/login/login';

export const routes: Routes = [
    {path: 'navbar', component: Navbar },
    {path: 'header', component: Header},
    {path: 'login', component: Login}
];
