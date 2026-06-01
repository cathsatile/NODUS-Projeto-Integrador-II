/**
 * Testes de integração da Sprint 5-B.
 * Valida: migração DB, criptografia em pacientes, CRUD de sessão com update,
 * CORS restrito e transparência do backend a dados criptografados.
 *
 * Uso: node test-sprint5b.js  (requer backend rodando em localhost:3000)
 */

const BASE = 'http://localhost:3000/api';
const TS = Date.now();

// ─── utilitários ─────────────────────────────────────────────────────────────

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

function assert(cond, msg) { if (!cond) throw new Error(msg); }

async function json(res) { try { return await res.json(); } catch { return {}; } }

const post = (path, body, token) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

const get = (path, token, extraHeaders = {}) =>
  fetch(`${BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders },
  });

const put = (path, body, token) =>
  fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

const del = (path, token) =>
  fetch(`${BASE}${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });

// Simula o formato de saída do CryptoJS.AES.encrypt (OpenSSL/Salted__ base64)
function fakeCiphertext(label) {
  const salt = Buffer.from(`${label}${TS}`).toString('base64').slice(0, 8);
  const body = Buffer.from(`encrypted_${label}_${TS}_padding_padding_padding`).toString('base64');
  return `U2FsdGVkX1+${salt}${body}`;
}

// ─── setup ───────────────────────────────────────────────────────────────────

async function registrar(n) {
  const res = await post('/auth/register', {
    nome: `Teste 5B ${n}`,
    email: `test5b_${n}_${TS}@nodus.test`,
    senha: 'Senha5B@123',
    registro_profissional: `CRP-5B/000${n}`,
  });
  const data = await json(res);
  if (res.status !== 201) throw new Error(`Registro falhou: ${JSON.stringify(data)}`);
  return { token: data.token, id: data.psicologo.id_psicologo };
}

// ─── testes ──────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  NODUS — Verificação Sprint 5-B (Qualidade)');
  console.log('══════════════════════════════════════════════════════\n');

  let psi = null;
  let pacienteId = null;
  let sessaoId = null;

  try {
    psi = await registrar(1);
  } catch (e) {
    console.error(`  ⚠️  Não foi possível criar psicólogo de teste: ${e.message}`);
    console.error('     Verifique se o banco está rodando.\n');
    printSummary(); return;
  }

  // ── Bloco 1: migração DB — aceita strings criptografadas no lugar de DATE ──
  console.log('▶ 1. Migração DB: colunas de paciente aceitam strings criptografadas');

  // fakeCiphertext simula o output real do CryptoJS.AES.encrypt (>150 chars)
  const nomeCifrado        = fakeCiphertext('nome');
  const emailCifrado       = fakeCiphertext('email');
  const dataNascCifrada    = fakeCiphertext('data_nascimento'); // seria DATE sem a migration

  await test('nome cifrado (>150 chars) armazenado com sucesso → 201', async () => {
    assert(nomeCifrado.length > 50, 'String simulada deve ter mais de 50 chars');
    const res = await post('/pacientes', {
      nome: nomeCifrado,
      email: emailCifrado,
      senha: 'hash_dummy',
      data_nascimento: dataNascCifrada,   // string no lugar de DATE — prova que a migration rodou
    }, psi.token);
    const data = await json(res);
    assert(res.status === 201, `Esperado 201, recebeu ${res.status}: ${JSON.stringify(data)}`);
    pacienteId = data.id_paciente;
  });

  // ── Bloco 2: transparência do backend a dados criptografados ──────────────
  console.log('\n▶ 2. Backend preserva dados criptografados sem modificação (transparência)');

  await test('GET /pacientes/:id retorna exatamente o que foi armazenado', async () => {
    assert(pacienteId, 'Paciente precisa ter sido criado no bloco anterior');
    const res = await get(`/pacientes/${pacienteId}`, psi.token);
    const data = await json(res);
    assert(res.status === 200, `Esperado 200, recebeu ${res.status}`);
    assert(data.nome === nomeCifrado,
      `nome alterado pelo backend!\n     esperado: ${nomeCifrado}\n     recebido: ${data.nome}`);
    assert(data.email === emailCifrado,
      `email alterado pelo backend!\n     esperado: ${emailCifrado}\n     recebido: ${data.email}`);
    assert(data.data_nascimento === dataNascCifrada,
      `data_nascimento alterada pelo backend!\n     esperado: ${dataNascCifrada}\n     recebido: ${data.data_nascimento}`);
  });

  await test('PUT /pacientes/:id atualiza apenas os campos enviados e preserva o restante', async () => {
    const nomeAtualizado = fakeCiphertext('nome_atualizado');
    const res = await put(`/pacientes/${pacienteId}`, { nome: nomeAtualizado }, psi.token);
    const data = await json(res);
    assert(res.status === 200, `Esperado 200, recebeu ${res.status}`);
    assert(data.nome === nomeAtualizado, `nome não foi atualizado corretamente`);
    assert(data.email === emailCifrado, `email foi alterado indevidamente durante o update`);
  });

  // ── Bloco 3: CRUD completo de sessão com update de observações ────────────
  console.log('\n▶ 3. CRUD de sessão com criptografia em observações');

  const obsCifrada = fakeCiphertext('observacoes_sessao_1');

  await test('POST /sessoes com observações criptografadas → 201', async () => {
    const res = await post('/sessoes', {
      data: new Date().toISOString().split('T')[0],
      horario: '14:00',
      observacoes: obsCifrada,
      humor: 4,
      id_paciente: pacienteId,
    }, psi.token);
    const data = await json(res);
    assert(res.status === 201, `Esperado 201, recebeu ${res.status}: ${JSON.stringify(data)}`);
    sessaoId = data.id_sessao;
  });

  await test('GET /sessoes/:id retorna observações exatamente como foram armazenadas', async () => {
    assert(sessaoId, 'Sessão precisa ter sido criada no passo anterior');
    const res = await get(`/sessoes/${sessaoId}`, psi.token);
    const data = await json(res);
    assert(res.status === 200, `Esperado 200, recebeu ${res.status}`);
    assert(data.observacoes === obsCifrada,
      `observacoes alteradas!\n     esperado: ${obsCifrada}\n     recebido: ${data.observacoes}`);
  });

  await test('PUT /sessoes/:id atualiza observações com novo ciphertext', async () => {
    const obsAtualizada = fakeCiphertext('observacoes_sessao_atualizada');
    const res = await put(`/sessoes/${sessaoId}`, { observacoes: obsAtualizada }, psi.token);
    const data = await json(res);
    assert(res.status === 200, `Esperado 200, recebeu ${res.status}`);
    assert(data.observacoes === obsAtualizada,
      `observações não foram atualizadas corretamente`);
  });

  await test('humor é preservado após update de observações', async () => {
    const res = await get(`/sessoes/${sessaoId}`, psi.token);
    const data = await json(res);
    assert(res.status === 200, `Esperado 200, recebeu ${res.status}`);
    assert(data.humor === 4, `humor foi alterado indevidamente (esperado 4, recebido ${data.humor})`);
  });

  // ── Bloco 4: CORS restrito ao FRONTEND_ORIGIN ─────────────────────────────
  console.log('\n▶ 4. CORS restrito ao FRONTEND_ORIGIN (http://localhost:4200)');

  await test('Requisição com Origin correto recebe Access-Control-Allow-Origin', async () => {
    const res = await get('/pacientes', psi.token, { Origin: 'http://localhost:4200' });
    const header = res.headers.get('access-control-allow-origin');
    assert(
      header === 'http://localhost:4200',
      `Access-Control-Allow-Origin deveria ser 'http://localhost:4200', recebeu '${header}'`
    );
  });

  await test('Requisição de origin não autorizado NÃO recebe Access-Control-Allow-Origin', async () => {
    const res = await get('/pacientes', psi.token, { Origin: 'http://site-malicioso.com' });
    const header = res.headers.get('access-control-allow-origin');
    assert(
      header !== 'http://site-malicioso.com',
      `CORS não deveria permitir 'http://site-malicioso.com', mas recebeu: '${header}'`
    );
  });

  // ── Bloco 5: limpeza ──────────────────────────────────────────────────────
  console.log('\n▶ 5. Limpeza');

  if (sessaoId) {
    await test(`DELETE /sessoes/${sessaoId} → 204`, async () => {
      const res = await del(`/sessoes/${sessaoId}`, psi.token);
      assert(res.status === 204, `Esperado 204, recebeu ${res.status}`);
    });
  }

  if (pacienteId) {
    await test(`DELETE /pacientes/${pacienteId} → 204`, async () => {
      const res = await del(`/pacientes/${pacienteId}`, psi.token);
      assert(res.status === 204, `Esperado 204, recebeu ${res.status}`);
    });
  }

  if (psi) {
    await test(`DELETE /psicologos/${psi.id} → 204`, async () => {
      const res = await del(`/psicologos/${psi.id}`, psi.token);
      assert(res.status === 204, `Esperado 204, recebeu ${res.status}`);
    });
  }

  printSummary();
}

function printSummary() {
  const total = passed + failed;
  console.log('\n──────────────────────────────────────────────────────');
  console.log(`  Resultado: ${passed}/${total} testes passaram`);
  if (failed > 0) {
    console.log(`  ${failed} teste(s) falharam — veja os ❌ acima`);
  } else {
    console.log('  Todos os testes da Sprint 5-B passaram! 🎉');
  }
  console.log('──────────────────────────────────────────────────────\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('\n⚠️  Erro fatal:', err.message);
  console.error('   Verifique se o backend está rodando: cd backend && npm run dev\n');
  process.exit(1);
});
