# Trilha mobile (Capacitor/Android) — congelada

Em 2026-08-21, com o pivô para app desktop (ver [`PLANO-CONVERSAO-DESKTOP.md`](./PLANO-CONVERSAO-DESKTOP.md), seções 2.3 e 6), a integração mobile deixou de fazer parte do escopo ativo. Para não confundir quem navega pelo repositório com uma trilha fora de escopo, `nodus-app/android/` e `nodus-app/capacitor.config.ts` foram removidos da branch principal e preservados integralmente na branch `frozen/mobile-capacitor`.

Nada foi perdido — é reversível a qualquer momento:

```bash
git checkout frozen/mobile-capacitor -- nodus-app/android nodus-app/capacitor.config.ts
```

Observações:
- `nodus-app/package.json` ainda lista `@capacitor/android`, `@capacitor/cli` e `@capacitor/core` como dependências. Elas não quebram o build do Angular (nenhum arquivo em `src/` ou `angular.json` depende delas), mas ficaram órfãs — vale removê-las quando o time confirmar que a trilha mobile não volta no curto prazo.
- Se a trilha mobile for retomada no futuro, essa branch é o ponto de partida.
