// Usado no build de produção do Electron (ng build --configuration=electron).
// O backend Express roda em loopback no mesmo processo — porta fixa 3000.
export const environment = {
  production: true,
  apiUrl: 'http://127.0.0.1:3000/api',
};
