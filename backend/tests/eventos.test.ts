import Module from 'module'
let seq=0
const rows:any[]=[]
const match=(r:any,w:any):boolean=>!w||Object.entries(w).every(([k,v]:any)=>k==='OR'?v.some((x:any)=>match(r,x)):(v&&typeof v==='object'&&!(v instanceof Date)?(('gte' in v?r[k]>=v.gte:true)&&('lte' in v?r[k]<=v.lte:true)):r[k]===v))
const evento={
  create:async({data}:any)=>{const r={id:'e'+(++seq),eventoPaiId:null,regraRecorrencia:null,...data};rows.push(r);return r},
  createMany:async({data}:any)=>{data.forEach((d:any)=>rows.push({id:'e'+(++seq),eventoPaiId:null,regraRecorrencia:null,...d}));return{count:data.length}},
  findUnique:async({where,include}:any)=>{const r=rows.find(x=>x.id===where.id);if(!r)return null;return include?{...r,eventoPai:r.eventoPaiId?rows.find(x=>x.id===r.eventoPaiId):null}:r},
  findMany:async({where,include}:any={})=>rows.filter(r=>match(r,where)).sort((a,b)=>a.inicio-b.inicio).map(r=>include?{...r,eventoPai:r.eventoPaiId?rows.find(x=>x.id===r.eventoPaiId):null}:r),
  update:async({where,data}:any)=>{const r=rows.find(x=>x.id===where.id);Object.assign(r,data);if(data.regraRecorrencia&&data.regraRecorrencia._db)r.regraRecorrencia=null;return r},
  deleteMany:async({where}:any)=>{let n=0;for(let i=rows.length-1;i>=0;i--)if(match(rows[i],where)){rows.splice(i,1);n++}return{count:n}},
  delete:async({where}:any)=>{const del=(id:string)=>{rows.filter(r=>r.eventoPaiId===id).forEach(c=>del(c.id));const i=rows.findIndex(r=>r.id===id);if(i>=0)rows.splice(i,1)};del(where.id)},
}
const prisma:any={evento,$transaction:async(a:any)=>typeof a==='function'?a(prisma):Promise.all(a)}
const o=(Module as any)._load
;(Module as any)._load=function(r:string,...a:any[]){if(r.endsWith('utils/prisma'))return{default:prisma,__esModule:true};if(r==='@prisma/client')return{Prisma:{DbNull:{_db:true}}};return o.call(this,r,...a)}
const c=require('../src/controllers/eventosController')
const call=async(fn:any,req:any)=>{let out:any={};const res:any={status(s:number){out.status=s;return res},json(b:any){out.body=b;return res},send(){return res}};try{await fn({params:{},query:{},body:{},...req},res)}catch(e:any){out.err=e.message||String(e)}return out}
let ok=true;const t=(c:boolean,m:string)=>{console.log(c?'ok':'FAIL',m);if(!c)ok=false}
const fmt=(d:Date)=>new Date(d.getTime()-180*60000).toISOString().slice(0,16).replace('T',' ')
;(async()=>{
  // domingo 01/11/2026 21:00 BRT
  const base={nome:'EBD',tipo:'REUNIAO',inicio:'2026-11-02T00:00:00.000Z',fusoMinutos:180}
  let r=await call(c.criar,{body:{...base,recorrencia:'SEMANAL',regraRecorrencia:{diasSemana:[0],intervalo:1,criterioParada:{tipo:'OCORRENCIAS',valor:4}}}})
  t(r.status===201&&rows.length===4,'semanal cria 4 eventos (antes criava 1)')
  t(rows.map(x=>fmt(x.inicio)).join()==='2026-11-01 21:00,2026-11-08 21:00,2026-11-15 21:00,2026-11-22 21:00','repete toda semana no domingo')
  const pai=rows[0];t(rows.slice(1).every(x=>x.eventoPaiId===pai.id&&x.recorrencia==='SEMANAL'),'filhas ligadas ao pai')
  r=await call(c.listar,{query:{mes:'11',ano:'2026'}})
  t(r.body.length===4&&r.body[2].serieId===pai.id&&r.body[2].regraSerie.diasSemana[0]===0,'listar devolve serieId e regra')
  r=await call(c.previa,{body:{...base,recorrencia:'MENSAL',regraRecorrencia:{intervalo:1,criterioParada:{tipo:'OCORRENCIAS',valor:3}}}})
  t(r.body.total===3&&rows.length===4,'prévia não grava')
  r=await call(c.criar,{body:{...base,recorrencia:'SEMANAL',regraRecorrencia:{diasSemana:[],criterioParada:{tipo:'OCORRENCIAS',valor:3}}}})
  t(!!r.err,'semanal sem dias é recusado')
  // editar só uma ocorrência
  const filha=rows[2]
  r=await call(c.atualizar,{params:{id:filha.id},query:{escopo:'ocorrencia'},body:{...base,nome:'EBD especial',inicio:'2026-11-15T12:00:00.000Z',recorrencia:'SEMANAL'}})
  t(rows.filter(x=>x.nome==='EBD especial').length===1&&rows[2].eventoPaiId===pai.id,'editar só este dia')
  // editar série a partir de uma filha: muda horário para 20:00 BRT e local
  r=await call(c.atualizar,{params:{id:rows[1].id},query:{escopo:'serie'},body:{...base,nome:'EBD',local:'Salão',inicio:'2026-11-08T23:00:00.000Z',recorrencia:'SEMANAL'}})
  t(rows.every(x=>x.local==='Salão')&&fmt(rows[1].inicio)==='2026-11-08 20:00'&&fmt(rows[0].inicio)==='2026-11-01 20:00','série: local e horário em todas')
  // editar pai: vira terça+quinta, 5 ocorrências → regenera
  r=await call(c.atualizar,{params:{id:pai.id},body:{...base,inicio:'2026-11-03T22:30:00.000Z',recorrencia:'SEMANAL',regraRecorrencia:{diasSemana:[2,4],criterioParada:{tipo:'OCORRENCIAS',valor:5}}}})
  t(rows.length===5&&rows.map(x=>fmt(x.inicio)).slice(0,3).join()==='2026-11-03 19:30,2026-11-05 19:30,2026-11-10 19:30','editar pai regenera a série')
  // pai -> NENHUMA remove filhas
  r=await call(c.atualizar,{params:{id:pai.id},body:{...base,recorrencia:'NENHUMA'}})
  t(rows.length===1&&rows[0].regraRecorrencia===null,'pai -> único apaga filhas')
  // excluir
  await call(c.criar,{body:{...base,recorrencia:'MENSAL',regraRecorrencia:{intervalo:1,criterioParada:{tipo:'OCORRENCIAS',valor:3}}}})
  t(rows.length===4,'mensal cria 3 meses (antes 1)')
  const f2=rows[2]
  await call(c.remover,{params:{id:f2.id},query:{escopo:'ocorrencia'}});t(rows.length===3,'remover só este dia')
  await call(c.remover,{params:{id:rows[2].id},query:{escopo:'serie'}});t(rows.length===1,'remover série a partir de filha (sobra o evento único)')
  rows.length=0
  r=await call(c.criar,{body:{nome:'Ceia',tipo:'CULTO',inicio:'2026-11-03T22:30:00.000Z',fusoMinutos:180,recorrencia:'MENSAL',regraRecorrencia:{mensalPor:'DIA_DA_SEMANA',semanaDoMes:1,diaSemanaMes:2,intervalo:1,criterioParada:{tipo:'OCORRENCIAS',valor:3}}}})
  t(rows.map(x=>fmt(x.inicio)).join()==='2026-11-03 19:30,2026-12-01 19:30,2027-01-05 19:30'&&rows[0].regraRecorrencia.mensalPor==='DIA_DA_SEMANA','1ª terça do mês: grava regra e filhas')
  rows.length=0
  r=await call(c.criar,{body:{nome:'Mutirão',tipo:'REUNIAO',inicio:'2026-11-03T11:00:00.000Z',fusoMinutos:180,recorrencia:'PERSONALIZADA',regraRecorrencia:{unidade:'DIAS',intervalo:15,criterioParada:{tipo:'OCORRENCIAS',valor:3}}}})
  t(rows.map(x=>fmt(x.inicio)).join()==='2026-11-03 08:00,2026-11-18 08:00,2026-12-03 08:00'&&rows[0].regraRecorrencia.unidade==='DIAS','a cada 15 dias')
  process.exit(ok?0:1)
})()
