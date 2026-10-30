import { diasAteAniversario, proximoAniversario } from '../src/utils/aniversario'
let f=0;const ok=(n:string,c:boolean,x?:any)=>{console.log(c?'OK  ':'FAIL',n,c?'':JSON.stringify(x));if(!c)f++}
const nasc=(s:string)=>new Date(s+'T00:00:00.000Z')   // como o Postgres DATE chega via Prisma
const agora=(y:number,m:number,d:number,h=0,min=0)=>new Date(y,m-1,d,h,min)  // data/hora local do servidor

ok('aniversário HOJE (meia-noite) = 0 dias', diasAteAniversario(nasc('1990-10-30'), agora(2026,10,30,0,0))===0)
ok('aniversário HOJE às 10h30 = 0 dias (era o bug)', diasAteAniversario(nasc('1990-10-30'), agora(2026,10,30,10,30))===0)
ok('aniversário HOJE às 23h59 = 0 dias', diasAteAniversario(nasc('1990-10-30'), agora(2026,10,30,23,59))===0)
ok('amanhã = 1', diasAteAniversario(nasc('2000-10-31'), agora(2026,10,30,15))===1)
ok('ontem = 364 (só no ano que vem)', diasAteAniversario(nasc('2000-10-29'), agora(2026,10,30,15))===364)
ok('em 7 dias = 7', diasAteAniversario(nasc('2000-11-06'), agora(2026,10,30,15))===7)
ok('virada de ano: 31/12 → 02/01 = 2', diasAteAniversario(nasc('1980-01-02'), agora(2026,12,31,9))===2)
ok('virada de ano: hoje 01/01, nasc 01/01 = 0', diasAteAniversario(nasc('1980-01-01'), agora(2027,1,1,8))===0)
ok('independe de horário de verão (março→outubro)', diasAteAniversario(nasc('1990-11-15'), agora(2026,3,1,12))===259)
const p=proximoAniversario(nasc('1990-10-30'), agora(2026,10,30,10,30)); ok('próximo aniversário de hoje = 30/10/2026', p.toISOString().startsWith('2026-10-30'), p)
const p2=proximoAniversario(nasc('1990-10-29'), agora(2026,10,30,10,30)); ok('próximo aniversário de ontem = 29/10/2027', p2.toISOString().startsWith('2027-10-29'), p2)
console.log(f?`\n${f} FALHA(S)`:'\nTODOS OK');process.exit(f?1:0)
