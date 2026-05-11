import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})

export class AuthService {
    private token: string | null = null;

    constructor( ) {
        this.token = localStorage.getItem('auth_token')
    }

    setToken(token: string): void {
        localStorage.setItem('auth_token', token);
    }

    getToken(): string | null {
        return this.token
    }

    isAuthenticated(): boolean {
        return !!this.token && JSON.parse(atob(this.token.split(' ')[1])).exp * 1000 > Date.now();
    }

}
