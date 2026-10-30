import { gerarOcorrencias } from '../src/utils/recorrencia'
const fmt=(d:Date)=>new Date(d.getTime()-180*60000).toISOString().slice(0,16).replace('T',' ')
let ok=true; const eq=(a:any,b:any,m:string)=>{const A=JSON.stringify(a),B=JSON.stringify(b); if(A!==B){ok=false;console.log('FAIL',m,A,B)} else console.log('ok',m)}
// domingo 01/11/2026 21:00 Brasília = 00:00Z de 02/11
const dom=new Date('2026-11-02T00:00:00Z')
eq(gerarOcorrencias(dom,'SEMANAL',{diasSemana:[0],criterioParada:{tipo:'OCORRENCIAS',valor:3}}).map(fmt),['2026-11-01 21:00','2026-11-08 21:00','2026-11-15 21:00'],'semanal domingo noite (UTC)')
eq(gerarOcorrencias(new Date('2026-11-03T22:30:00Z'),'SEMANAL',{diasSemana:[2,4],criterioParada:{tipo:'OCORRENCIAS',valor:4}}).map(fmt),['2026-11-03 19:30','2026-11-05 19:30','2026-11-10 19:30','2026-11-12 19:30'],'ter+qui')
eq(gerarOcorrencias(new Date('2026-11-03T22:30:00Z'),'SEMANAL',{diasSemana:[2],intervalo:2,criterioParada:{tipo:'DATA',valor:'2026-12-01'}}).map(fmt),['2026-11-03 19:30','2026-11-17 19:30','2026-12-01 19:30'],'quinzenal até data inclusiva')
eq(gerarOcorrencias(new Date('2026-11-04T22:30:00Z'),'SEMANAL',{diasSemana:[2,5],criterioParada:{tipo:'OCORRENCIAS',valor:2}}).map(fmt),['2026-11-06 19:30','2026-11-10 19:30'],'primeira data = 1ª que bate (qua → sex)')
eq(gerarOcorrencias(new Date('2026-01-31T15:00:00Z'),'MENSAL',{criterioParada:{tipo:'OCORRENCIAS',valor:4}}).map(fmt),['2026-01-31 12:00','2026-02-28 12:00','2026-03-31 12:00','2026-04-30 12:00'],'mensal dia 31')
eq(gerarOcorrencias(new Date('2026-11-12T21:30:00Z'),'MENSAL',{intervalo:2,criterioParada:{tipo:'DATA',valor:'2027-03-12'}}).map(fmt),['2026-11-12 18:30','2027-01-12 18:30','2027-03-12 18:30'],'bimestral')
eq(gerarOcorrencias(dom,'SEMANAL',{diasSemana:[0],criterioParada:{tipo:'OCORRENCIAS',valor:9999}}).length,200,'limite 200')
eq(gerarOcorrencias(new Date('2026-11-03T22:30:00Z'),'MENSAL',{mensalPor:'DIA_DA_SEMANA',semanaDoMes:1,diaSemanaMes:2,criterioParada:{tipo:'OCORRENCIAS',valor:3}}).map(fmt),['2026-11-03 19:30','2026-12-01 19:30','2027-01-05 19:30'],'1ª terça do mês')
eq(gerarOcorrencias(new Date('2026-11-08T21:00:00Z'),'MENSAL',{mensalPor:'DIA_DA_SEMANA',semanaDoMes:1,diaSemanaMes:0,criterioParada:{tipo:'OCORRENCIAS',valor:3}}).map(fmt),['2026-12-06 18:00','2027-01-03 18:00','2027-02-07 18:00'],'1º domingo: nov já passou (início 08/11) → começa em dez')
eq(gerarOcorrencias(new Date('2026-11-01T21:00:00Z'),'MENSAL',{mensalPor:'DIA_DA_SEMANA',semanaDoMes:-1,diaSemanaMes:5,criterioParada:{tipo:'DATA',valor:'2027-01-31'}}).map(fmt),['2026-11-27 18:00','2026-12-25 18:00','2027-01-29 18:00'],'última sexta')
eq(gerarOcorrencias(new Date('2026-11-01T21:00:00Z'),'DIARIA',{intervalo:10,criterioParada:{tipo:'OCORRENCIAS',valor:3}}).map(fmt),['2026-11-01 18:00','2026-11-11 18:00','2026-11-21 18:00'],'a cada 10 dias')
eq(gerarOcorrencias(new Date('2026-11-01T21:00:00Z'),'DIARIA',{criterioParada:{tipo:'DATA',valor:'2026-11-03'}}).map(fmt),['2026-11-01 18:00','2026-11-02 18:00','2026-11-03 18:00'],'todo dia até data')
process.exit(ok?0:1)
