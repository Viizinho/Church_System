/**
 * Teste de ponta a ponta da API (Express real + banco em memória).
 * Roda sem Postgres:  npx tsx tests/api.test.ts
 * Cobre: cabeçalhos de segurança, autenticação/JWT, rate limit, validação (XSS por URL),
 * corrida de aprovação, estouro de meta, troca de senha e handler de erros.
 */
process.env.DATABASE_URL ??= 'postgres://teste'
process.env.JWT_SECRET ??= 'segredo-de-teste-com-mais-de-32-caracteres!!'
process.env.NODE_ENV = 'test'

import Module from 'module'
import http from 'http'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// ─── Banco em memória (subconjunto do Prisma usado pelos controllers) ───────────
type Row = Record<string, any>
let seq = 0
const tabelas: Record<string, Row[]> = {}
const casa = (r: Row, w: Row = {}): boolean =>
  Object.entries(w).every(([k, v]) => {
    if (k === 'OR') return (v as Row[]).some((x) => casa(r, x))
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('in' in v) return v.in.includes(r[k])
      if ('contains' in v) return String(r[k] ?? '').toLowerCase().includes(String(v.contains).toLowerCase())
      if ('not' in v) return r[k] !== v.not
      if ('gte' in v || 'lte' in v) return (!('gte' in v) || r[k] >= v.gte) && (!('lte' in v) || r[k] <= v.lte)
    }
    return r[k] === v
  })
const modelo = (nome: string) => {
  const t = (tabelas[nome] ??= [])
  return {
    create: async ({ data }: Row) => { const r = { id: 'id' + ++seq, criadoEm: new Date(), ...(nome === 'contribuicao' ? { status: 'PENDENTE' } : {}), ...data }; t.push(r); return r },
    findUnique: async ({ where }: Row) => t.find((r) => casa(r, where)) ?? null,
    findUniqueOrThrow: async ({ where }: Row) => { const r = t.find((x) => casa(x, where)); if (!r) throw new Error('não achou'); return r },
    findMany: async ({ where, take }: Row = {}) => t.filter((r) => casa(r, where)).slice(0, take),
    updateMany: async ({ where, data }: Row) => { const alvo = t.filter((r) => casa(r, where)); alvo.forEach((r) => Object.assign(r, data)); return { count: alvo.length } },
    update: async ({ where, data }: Row) => { const r = t.find((x) => casa(x, where)); Object.assign(r!, data); return r },
    upsert: async ({ where, update, create }: Row) => { const r = t.find((x) => casa(x, where)); if (r) return Object.assign(r, update); const n = { ...create }; t.push(n); return n },
    aggregate: async ({ where, _sum }: Row) => ({ _sum: Object.fromEntries(Object.keys(_sum).map((k) => [k, t.filter((r) => casa(r, where)).reduce((a, r) => a + Number(r[k] ?? 0), 0)])) }),
    groupBy: async ({ by, where, _sum }: Row) => {
      const g = new Map<string, Row>()
      for (const r of t.filter((x) => casa(x, where))) {
        const chave = by.map((b: string) => r[b]).join('|')
        const e = g.get(chave) ?? { ...Object.fromEntries(by.map((b: string) => [b, r[b]])), _sum: Object.fromEntries(Object.keys(_sum).map((k) => [k, 0])) }
        for (const k of Object.keys(_sum)) e._sum[k] += Number(r[k] ?? 0)
        g.set(chave, e)
      }
      return [...g.values()]
    },
    delete: async ({ where }: Row) => { const i = t.findIndex((r) => casa(r, where)); t.splice(i, 1) },
    count: async ({ where }: Row = {}) => t.filter((r) => casa(r, where)).length,
  }
}
const prisma: any = new Proxy({}, {
  get: (_, nome: string) => {
    if (nome === '$transaction') return async (fn: any) => (typeof fn === 'function' ? fn(prisma) : Promise.all(fn))
    if (nome === '$queryRaw') return async () => [{ ok: 1 }]
    if (nome === '$disconnect') return async () => {}
    return modelo(nome)
  },
})
const original = (Module as any)._load
;(Module as any)._load = function (req: string, ...a: any[]) {
  if (req.endsWith('utils/prisma')) return { default: prisma, __esModule: true }
  if (req === '@prisma/client') {
    class PrismaClientKnownRequestError extends Error { code = '' }
    return { PrismaClient: class {}, Prisma: { PrismaClientKnownRequestError, TransactionIsolationLevel: { Serializable: 'Serializable' }, DbNull: null } }
  }
  return original.call(this, req, ...a)
}

// ─── Utilidades de teste ──────────────────────────────────────────────────────
let falhas = 0
const ok = (cond: boolean, msg: string, extra = '') => { console.log(cond ? 'ok  ' : 'FAIL', msg, cond ? '' : extra); if (!cond) falhas++ }

async function main() {
  const app = (await import('../src/app')).default
  const server = http.createServer(app)
  await new Promise<void>((r) => server.listen(0, r))
  const base = `http://127.0.0.1:${(server.address() as any).port}`
  const req = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}, raw?: string) => {
    const r = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined || raw ? { 'content-type': 'application/json' } : {}), ...headers },
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    })
    const txt = await r.text()
    let json: any = null
    try { json = JSON.parse(txt) } catch { /* não-JSON */ }
    return { status: r.status, json, headers: r.headers, txt }
  }

  tabelas.usuario = [{ id: 'u1', nome: 'Admin', email: 'admin@igreja.com', senhaHash: bcrypt.hashSync('SenhaForte123', 4) }]

  // 1. Cabeçalhos
  const h = await req('GET', '/health')
  ok(h.status === 200, 'health responde 200')
  ok(!h.headers.get('x-powered-by'), 'sem X-Powered-By')
  ok(/default-src 'self'/.test(h.headers.get('content-security-policy') ?? ''), 'CSP presente')
  ok(h.headers.get('x-content-type-options') === 'nosniff', 'nosniff')
  ok((await req('GET', '/ready')).status === 200, 'ready consulta o banco')
  const nf = await req('GET', '/api/nao-existe')
  ok(nf.status === 404 && nf.json?.error, '404 em JSON para rota desconhecida')

  // 2. Autenticação
  ok((await req('GET', '/api/membros')).status === 401, 'rota protegida sem token → 401')
  ok((await req('GET', '/api/membros', undefined, { authorization: 'Bearer lixo' })).status === 401, 'token inválido → 401')
  const semAlg = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from('{"sub":"u1","nome":"x"}').toString('base64url') + '.'
  ok((await req('GET', '/api/membros', undefined, { authorization: 'Bearer ' + semAlg })).status === 401, 'token alg:none → 401')
  const hs512 = jwt.sign({ sub: 'u1', nome: 'x' }, process.env.JWT_SECRET!, { algorithm: 'HS512' })
  ok((await req('GET', '/api/membros', undefined, { authorization: 'Bearer ' + hs512 })).status === 401, 'token HS512 (algoritmo diferente) → 401')

  const l1 = await req('POST', '/api/auth/login', { email: 'ninguem@x.com', senha: 'qualquer' })
  const l2 = await req('POST', '/api/auth/login', { email: 'admin@igreja.com', senha: 'errada' })
  ok(l1.status === 401 && l2.status === 401 && l1.json.error === l2.json.error, 'login: mesma mensagem para e-mail inexistente e senha errada')
  const login = await req('POST', '/api/auth/login', { email: ' ADMIN@igreja.com ', senha: 'SenhaForte123' })
  ok(login.status === 200 && !!login.json.token && !('senhaHash' in login.json.usuario), 'login válido (e-mail normalizado) sem vazar hash')
  const auth = { authorization: 'Bearer ' + login.json.token }
  ok((await req('GET', '/api/auth/perfil', undefined, auth)).status === 200, 'perfil com token válido')

  // 3. Erros de entrada
  const bad = await req('POST', '/api/auth/login', undefined, {}, '{json quebrado')
  ok(bad.status === 400 && bad.json.error === 'JSON inválido.', 'JSON malformado → 400 (antes era 500)')
  const grande = await req('POST', '/api/auth/login', { email: 'a@a.com', senha: 'x'.repeat(200_000) })
  ok(grande.status === 413, 'corpo > 100kb → 413', String(grande.status))

  // 4. Campanha pública: XSS por URL, tamanhos, aprovação concorrente
  tabelas.itemCampanha = [{ id: 'item1', nome: 'Geladeira', valorTotal: 1000, ativo: true, ordem: 1, chavePix: 'pix', whatsappTesoureiro: '5583999990000' }]
  const url = (u: string, nome = 'Maria') => req('POST', '/api/publico/campanha/item1/contribuir', { nomeContribuidor: nome, valor: 100, comprovanteUrl: u })
  ok((await url('javascript:alert(document.cookie)')).status === 400, 'comprovante javascript: é recusado')
  ok((await url('data:text/html,<script>alert(1)</script>')).status === 400, 'comprovante data: é recusado')
  ok((await url('https://exemplo.com/comprovante.png')).status === 201, 'comprovante https é aceito')
  ok((await req('POST', '/api/publico/campanha/item1/contribuir', { nomeContribuidor: 'A'.repeat(500), valor: 10 })).status === 400, 'nome gigante é recusado')
  ok((await req('POST', '/api/publico/campanha/item1/contribuir', { nomeContribuidor: 'Fulano', valor: 99999999 })).status === 400, 'valor absurdo é recusado')
  const pend = tabelas.contribuicao.find((c) => c.status === 'PENDENTE')!
  const [a, b] = await Promise.all([
    req('PATCH', `/api/campanha/contribuicoes/${pend.id}/confirmar`, undefined, auth),
    req('PATCH', `/api/campanha/contribuicoes/${pend.id}/confirmar`, undefined, auth),
  ])
  ok([a.status, b.status].sort().join() === '200,409', 'aprovação simultânea: um 200 e um 409', `${a.status},${b.status}`)
  const itens = await req('GET', '/api/publico/campanha')
  ok(itens.json[0].valorArrecadado === 100, 'total arrecadado conta a contribuição uma única vez')
  ok((await req('GET', '/api/campanha/contribuicoes?status=QUALQUER', undefined, auth)).status === 400, 'status inválido na query → 400')

  // 5. Mão Amiga pública: não estoura a meta
  tabelas.metaCesta = [{ id: '11111111-1111-4111-8111-111111111111', nomeItem: 'Arroz', unidade: 'kg', quantidadeNecessaria: 10, ativo: true }]
  const doar = (q: number) => req('POST', '/api/publico/mao-amiga/doacoes', { nomeDoador: 'Ana', itens: [{ metaCestaId: '11111111-1111-4111-8111-111111111111', quantidade: q }] })
  ok((await doar(7)).status === 201, 'doa 7 de 10')
  const segunda = await doar(7)
  ok(segunda.status === 400 && /Só faltam 3/.test(segunda.json.error), 'segunda doação de 7 é barrada (só faltam 3)', JSON.stringify(segunda.json))
  const metas = await req('GET', '/api/publico/mao-amiga/metas')
  ok(metas.json[0].reservado === 7 && metas.json[0].restante === 3, 'metas públicas mostram reservado=7 e restante=3')
  ok((await req('POST', '/api/publico/mao-amiga/pix', { nomeDoador: 'Zé', comprovanteUrl: 'javascript:1' })).status === 400, 'pix com javascript: recusado')

  // 6. Configuração da landing page
  ok((await req('PUT', '/api/publico/config', { instagramUrl: 'javascript:alert(1)' }, auth)).status === 400, 'config: link javascript: recusado')
  ok((await req('PUT', '/api/publico/config', { instagramUrl: 'https://instagram.com/adju', sobre: 'Olá' }, auth)).status === 200, 'config: link https salvo')
  ok((await req('PUT', '/api/publico/config', { instagramUrl: 'https://x.com' })).status === 401, 'config exige login')

  // 7. Troca de senha
  ok((await req('PUT', '/api/auth/senha', { senhaAtual: 'errada', novaSenha: 'NovaSenha1234' }, auth)).status === 403, 'senha atual errada → 403')
  ok((await req('PUT', '/api/auth/senha', { senhaAtual: 'SenhaForte123', novaSenha: 'curta1' }, auth)).status === 400, 'nova senha fraca → 400')
  ok((await req('PUT', '/api/auth/senha', { senhaAtual: 'SenhaForte123', novaSenha: 'NovaSenha1234' }, auth)).status === 204, 'troca de senha → 204')
  ok((await req('POST', '/api/auth/login', { email: 'admin@igreja.com', senha: 'NovaSenha1234' })).status === 200, 'login com a nova senha')
  ok((await req('POST', '/api/auth/login', { email: 'admin@igreja.com', senha: 'SenhaForte123' })).status === 401, 'senha antiga deixa de valer')

  // 8. SSE
  const sse = await new Promise<{ status: number; tipo: string }>((resolve) => {
    http.get(base + '/api/publico/campanha/eventos', (res) => { resolve({ status: res.statusCode!, tipo: String(res.headers['content-type']) }); res.destroy() })
  })
  ok(sse.status === 200 && sse.tipo.includes('text/event-stream'), 'SSE abre com content-type correto')

  // 9. Rate limit do login (por último: 10 falhas por IP em 15 min)
  let ultimo = 0
  for (let i = 0; i < 12; i++) ultimo = (await req('POST', '/api/auth/login', { email: 'admin@igreja.com', senha: 'errada' + i })).status
  ok(ultimo === 429, 'login é limitado após várias falhas → 429', String(ultimo))

  server.close()
  console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.')
  process.exit(falhas ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
