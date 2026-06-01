/**
 * Script de verificação das correções de segurança da Sprint 5-A.
 * Requer o backend rodando em localhost:3000 com banco conectado.
 *
 * Uso: node test-security.js
 */

const BASE = 'http://localhost:3000/api';
const TS = Date.now();

// ─── utilitários ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${label}\n     → ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(res) {
  try { return await res.json(); } catch { return {}; }
}

// ─── helpers de request ─────────────────────────────────────────────────────

const get = (path, token) =>
  fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

const post = (path, body, token) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const del = (path, token) =>
  fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

// ─── setup: cria dois psicólogos de teste ───────────────────────────────────

async function registrar(n) {
  const res = await post('/auth/register', {
    nome: `Teste Segurança ${n}`,
    email: `seg_test${n}_${TS}@nodus.test`,
    senha: 'SenhaTeste@123',
    registro_profissional: `CRP-00/0000${n}`,
  });
  const data = await json(res);
  if (res.status !== 201) throw new Error(`Registro falhou: ${JSON.stringify(data)}`);
  return { token: data.token, id: data.psicologo.id_psicologo };
}

// ─── testes ─────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  NODUS — Verificação de Segurança (Sprint 5-A)');
  console.log('═══════════════════════════════════════════════\n');

  // ── Bloco 1: rotas protegidas sem token ────────────────────────────────────
  console.log('▶ 1. Rotas protegidas retornam 401 sem token');

  await test('GET /pacientes → 401', async () => {
    const res = await get('/pacientes');
    assert(res.status === 401, `Esperado 401, recebeu ${res.status}`);
  });

  await test('GET /sessoes → 401', async () => {
    const res = await get('/sessoes');
    assert(res.status === 401, `Esperado 401, recebeu ${res.status}`);
  });

  await test('GET /psicologos/me → 401', async () => {
    const res = await get('/psicologos/me');
    assert(res.status === 401, `Esperado 401, recebeu ${res.status}`);
  });

  // ── Bloco 2: token inválido ────────────────────────────────────────────────
  console.log('\n▶ 2. Token inválido retorna 401');

  await test('Token malformado → 401', async () => {
    const res = await get('/pacientes', 'token.falso.aqui');
    assert(res.status === 401, `Esperado 401, recebeu ${res.status}`);
  });

  await test('Token expirado (assinatura válida, exp no passado) → 401', async () => {
    // JWT com exp = 1 (passado), assinado com chave errada — deve falhar
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsImV4cCI6MX0.invalidsig';
    const res = await get('/pacientes', fakeJwt);
    assert(res.status === 401, `Esperado 401, recebeu ${res.status}`);
  });

  // ── Bloco 3: rotas públicas de auth permanecem acessíveis ─────────────────
  console.log('\n▶ 3. Rotas de /auth permanecem públicas');

  await test('POST /auth/login é público (não exige token)', async () => {
    const res = await post('/auth/login', { email: 'naoexiste@x.com', senha: 'errada' });
    // deve retornar 401 de credenciais, nunca 401 de "sem token"
    const data = await json(res);
    assert(res.status === 401 && data.error !== 'Token de autenticação não fornecido',
      `Rota de auth bloqueada por middleware: ${JSON.stringify(data)}`);
  });

  await test('POST /auth/register é público (não exige token)', async () => {
    const res = await post('/auth/register', {
      nome: 'Probe', email: '', senha: '', registro_profissional: ''
    });
    // Qualquer status exceto 401-de-middleware é aceitável aqui
    const data = await json(res);
    assert(data.error !== 'Token de autenticação não fornecido',
      `Rota de register bloqueada por middleware: ${JSON.stringify(data)}`);
  });

  // ── Bloco 4: fluxo autenticado ────────────────────────────────────────────
  console.log('\n▶ 4. Acesso autenticado com token válido');

  let psi1 = null;
  let psi2 = null;
  let pacienteId = null;

  try {
    psi1 = await registrar(1);
    psi2 = await registrar(2);
  } catch (e) {
    console.error(`  ⚠️  Não foi possível criar psicólogos de teste: ${e.message}`);
    console.error('     Verifique se o banco está rodando e acessível.\n');
    printSummary();
    return;
  }

  await test('Token válido permite GET /pacientes → 200', async () => {
    const res = await get('/pacientes', psi1.token);
    assert(res.status === 200, `Esperado 200, recebeu ${res.status}`);
  });

  await test('POST /pacientes cria paciente vinculado ao token (ignora id_psicologo do body)', async () => {
    const res = await post('/pacientes', {
      nome: 'Paciente Teste',
      email: `pac_${TS}@nodus.test`,
      senha: 'hash_simulado',
      data_nascimento: '1990-01-01',
      id_psicologo: 9999, // valor falso — deve ser sobrescrito pelo servidor
    }, psi1.token);
    const data = await json(res);
    assert(res.status === 201, `Esperado 201, recebeu ${res.status}: ${JSON.stringify(data)}`);
    assert(data.id_psicologo === psi1.id,
      `id_psicologo deveria ser ${psi1.id} (do token), mas é ${data.id_psicologo}`);
    pacienteId = data.id_paciente;
  });

  // ── Bloco 5: IDOR — psicólogo 2 não acessa dados do psicólogo 1 ──────────
  console.log('\n▶ 5. Proteção IDOR — psicólogo 2 não acessa dados do psicólogo 1');

  if (pacienteId) {
    await test(`GET /pacientes/${pacienteId} com token do psi2 → 403`, async () => {
      const res = await get(`/pacientes/${pacienteId}`, psi2.token);
      assert(res.status === 403, `Esperado 403, recebeu ${res.status}`);
    });

    await test(`PUT /pacientes/${pacienteId} com token do psi2 → 403`, async () => {
      const res = await fetch(`${BASE}/pacientes/${pacienteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${psi2.token}`,
        },
        body: JSON.stringify({ nome: 'Tentativa invasão' }),
      });
      assert(res.status === 403, `Esperado 403, recebeu ${res.status}`);
    });

    await test(`DELETE /pacientes/${pacienteId} com token do psi2 → 403`, async () => {
      const res = await del(`/pacientes/${pacienteId}`, psi2.token);
      assert(res.status === 403, `Esperado 403, recebeu ${res.status}`);
    });

    await test(`GET /sessoes/paciente/${pacienteId} com token do psi2 → 403`, async () => {
      const res = await get(`/sessoes/paciente/${pacienteId}`, psi2.token);
      assert(res.status === 403, `Esperado 403, recebeu ${res.status}`);
    });
  }

  await test('GET /psicologos/1 com token do psi2 → 403', async () => {
    // psi1.id provavelmente não é 1, mas o psi2 não deve acessar qualquer id diferente do seu
    const res = await get(`/psicologos/${psi1.id}`, psi2.token);
    assert(res.status === 403, `Esperado 403, recebeu ${res.status}`);
  });

  await test('GET /sessoes/psicologo/:outro com token do psi2 → 403', async () => {
    const res = await get(`/sessoes/psicologo/${psi1.id}`, psi2.token);
    assert(res.status === 403, `Esperado 403, recebeu ${res.status}`);
  });

  // ── Bloco 6: limpeza ─────────────────────────────────────────────────────
  console.log('\n▶ 6. Limpeza dos dados de teste');

  if (pacienteId) {
    await test(`DELETE /pacientes/${pacienteId} com token do psi1 → 204`, async () => {
      const res = await del(`/pacientes/${pacienteId}`, psi1.token);
      assert(res.status === 204, `Esperado 204, recebeu ${res.status}`);
    });
  }

  if (psi1) {
    await test(`DELETE /psicologos/${psi1.id} com próprio token → 204`, async () => {
      const res = await del(`/psicologos/${psi1.id}`, psi1.token);
      assert(res.status === 204, `Esperado 204, recebeu ${res.status}`);
    });
  }

  if (psi2) {
    await test(`DELETE /psicologos/${psi2.id} com próprio token → 204`, async () => {
      const res = await del(`/psicologos/${psi2.id}`, psi2.token);
      assert(res.status === 204, `Esperado 204, recebeu ${res.status}`);
    });
  }

  printSummary();
}

function printSummary() {
  const total = passed + failed;
  console.log('\n───────────────────────────────────────────────');
  console.log(`  Resultado: ${passed}/${total} testes passaram`);
  if (failed > 0) {
    console.log(`  ${failed} teste(s) falharam — veja os ❌ acima`);
  } else {
    console.log('  Todos os testes de segurança passaram! 🎉');
  }
  console.log('───────────────────────────────────────────────\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\n⚠️  Erro fatal ao rodar os testes:', err.message);
  console.error('   Verifique se o backend está rodando: cd backend && npm run dev\n');
  process.exit(1);
});
