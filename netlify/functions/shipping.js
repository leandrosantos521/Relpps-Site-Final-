const PROD='https://melhorenvio.com.br';
const SANDBOX='https://sandbox.melhorenvio.com.br';
function json(statusCode,body){return{statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(body)}}
function cleanCep(v){return String(v||'').replace(/\D/g,'').slice(0,8)}
function testQuotes(cep,items){
  const qty=items.reduce((n,i)=>n+Math.max(1,Number(i.quantity)||1),0);
  const seed=Number(cep.slice(-3)||0);
  const base=Math.max(12,Math.min(49,12+(seed%21)+qty*1.8));
  return {
    melhor_envio:[
      {id:'test-correios-pac',name:'Correios PAC',company:'Correios',price:Number(base.toFixed(2)),delivery_time:5+(seed%5)},
      {id:'test-correios-sedex',name:'Correios SEDEX',company:'Correios',price:Number((base+12.9).toFixed(2)),delivery_time:2+(seed%3)}
    ],
    uber:{id:'test-uber-moto',name:'Uber Moto',company:'Uber Direct',price:Number((Math.max(9,base*.78)).toFixed(2)),eta:'estimativa local'}
  };
}
async function melhorEnvioQuote({cep,items}){
  const token=process.env.MELHOR_ENVIO_TOKEN;
  const from=cleanCep(process.env.STORE_POSTAL_CODE);
  if(!token||from.length!==8) return null;
  const base=process.env.MELHOR_ENVIO_SANDBOX==='true'?SANDBOX:PROD;
  const payload={from:{postal_code:from},to:{postal_code:cep},products:items.map(i=>({id:String(i.id),width:Number(i.width)||11,height:Number(i.height)||17,length:Number(i.length)||11,weight:Number(i.weight)||.3,insurance_value:Number(i.price)||1,quantity:Number(i.quantity)||1})),options:{receipt:false,own_hand:false}};
  const r=await fetch(`${base}/api/v2/me/shipment/calculate`,{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json','User-Agent':process.env.MELHOR_ENVIO_USER_AGENT||'Relpps Cosméticos (contato@relpps.com.br)'},body:JSON.stringify(payload)});
  const data=await r.json().catch(()=>[]); if(!r.ok)throw new Error(data?.message||'Falha na cotação do Melhor Envio.');
  return Array.isArray(data)?data.filter(x=>!x.error).map(x=>({id:x.id,name:x.name||x.service||'Entrega',company:x.company?.name||x.company||'Melhor Envio',price:Number(x.custom_price??x.price??0),delivery_time:x.custom_delivery_time??x.delivery_time??null,raw:x})):[];
}
async function uberQuote(){
  // A cotação real é habilitada quando a loja receber as credenciais e aprovação do Uber Direct.
  // A API exige OAuth e dados da loja/ponto de retirada.
  if(process.env.UBER_DIRECT_ENABLED!=='true') return null;
  return null;
}
exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{message:'Método não permitido'});
    const body=JSON.parse(event.body||'{}'); const cep=cleanCep(body.cep); const items=Array.isArray(body.items)?body.items:[];
    if(cep.length!==8)return json(400,{message:'CEP inválido.'}); if(!items.length)return json(400,{message:'Carrinho vazio.'});
    const forcedTest=process.env.CHECKOUT_TEST_MODE!=='false';
    if(forcedTest){const q=testQuotes(cep,items);return json(200,{...q,testMode:true});}
    let melhor=[]; let uber=null;
    try{melhor=await melhorEnvioQuote({cep,items})||[];}catch(e){console.error('Melhor Envio',e);}
    try{uber=await uberQuote();}catch(e){console.error('Uber',e);}
    return json(200,{melhor_envio:melhor,uber,testMode:false});
  }catch(e){return json(500,{message:e.message||'Erro ao calcular frete.'});}
};
