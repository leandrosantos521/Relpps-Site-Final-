const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const money = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v)||0);
const slug = s => String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const brandKey = s => slug(s).replace(/[^a-z0-9]+/g,"");
// Chave canônica para marcas: evita que "Bad Pink" e "BadPink" sejam tratadas como marcas diferentes.
const BRAND_ALIASES = {
  badpink:["badpink","bad pink","bad-pink"],
  fadvan:["fadvan"],
  bluwe:["bluwe"],
  uzenails:["uzenails","uze nails","uze nail"],
  beautify:["beautify"],
  cherry:["cherry"],
  elitepremium:["elitepremium","elite premium"],
  skyrose:["skyrose","sky rose"],
  master:["master","master elite"],
  volia:["volia","vòlia","volia professional","vòlia professional"],
  mariasasha:["maria sasha","mariasasha"],
  cuccio:["cuccio"],
  repos:["repos","repós"],
  melhormed:["melhormed","melhor med","melhor-med"],
  nagaraku:["nagaraku"],
  decemars:["decemars"],
  macrilan:["macrilan"],
  sourcil:["sourcil"],
  activebrow:["active brow","activebrow"],
  webella:["we bella","webella"],
  cherrylash:["cherry lash","cherrylash"],
  hs:["hs10","hs 10","hs"]
};
function canonicalBrandKey(value){
  const raw=brandKey(value);
  if(!raw) return "";
  for(const [key,aliases] of Object.entries(BRAND_ALIASES)){
    if(aliases.some(alias=>brandKey(alias)===raw)) return key;
  }
  return BRAND_ALIASES[raw] ? raw : "";
}
function inferBrandFromText(value){
  const text=slug(value);
  for(const [key,aliases] of Object.entries(BRAND_ALIASES)){
    if(aliases.some(alias=>text.includes(slug(alias)))) return key;
  }
  return "";
}
function titleCaseBrand(value){
  const words=String(value||"").trim().replace(/\s+/g," ").split(" ").filter(Boolean);
  return words.map(word=>word.split(/([\-\/])/).map(part=>/^[\-\/]$/.test(part)?part:(part?part.charAt(0).toLocaleUpperCase("pt-BR")+part.slice(1).toLocaleLowerCase("pt-BR"):part)).join("")).join(" ");
}
function displayBrand(key){
  const names={badpink:"Bad Pink",fadvan:"Fadvan",bluwe:"Bluwe",uzenails:"Uze Nails",repos:"Repós",beautify:"Beautify",cherry:"Cherry",elitepremium:"Elite Premium",skyrose:"Sky Rose",master:"Master Elite",volia:"Vòlia",mariasasha:"Maria Sasha",cuccio:"Cuccio",melhormed:"Melhormed",nagaraku:"Nagaraku",decemars:"Decemars",macrilan:"Macrilan",sourcil:"Sourcil",activebrow:"Active Brow",webella:"We Bella",cherrylash:"Cherry Lash",hs:"HS"};
  return names[key]||"";
}
function formatBrandName(value){
  const key=canonicalBrandKey(value);
  return key ? displayBrand(key) : "";
}

function stripHtmlText(value){
  return String(value||"")
    .replace(/<[^>]*>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/g,"'")
    .replace(/\s+/g," ").trim();
}
// Padronização visual do catálogo: produtos em formato de frase, sem caixa alta excessiva.
// A primeira letra do nome fica maiúscula e o restante fica legível e uniforme.
function sentenceCasePtBr(value, fallback=""){
  const text=stripHtmlText(value).replace(/\s+/g," ").trim();
  if(!text) return fallback;
  const lower=text.toLocaleLowerCase("pt-BR");
  return lower.replace(/[A-Za-zÀ-ÖØ-öø-ÿ]/, ch=>ch.toLocaleUpperCase("pt-BR"));
}

function extractBrandSuffixCandidate(value){
  const text=stripHtmlText(value).trim();
  // Considera somente o último trecho após um separador com espaços, para não
  // confundir hífens técnicos do nome (8-12, 15-ml, 4D etc.).
  const parts=text.split(/\s+[-–—]\s+/).map(x=>x.trim()).filter(Boolean);
  if(parts.length<2) return "";
  const candidate=parts[parts.length-1];
  const normalized=slug(candidate);
  if(!candidate || /\d/.test(candidate) || candidate.length>40 || candidate.split(/\s+/).length>4) return "";
  if(/^(padrao|padrão|transparente|escolha a cor|escolha o tamanho|sortido|sortida)$/i.test(candidate)) return "";
  return candidate;
}
function formatBrandSuffixInProductName(value){
  let text=String(value||"").trim();
  if(!text) return text;
  // Quando o Bling traz a marca no final do nome após "-", mantém o produto
  // com visual de frase e a marca com capitalização oficial e elegante.
  const aliases=Object.entries(BRAND_ALIASES)
    .flatMap(([key,list])=>list.map(alias=>({key,alias})))
    .sort((a,b)=>b.alias.length-a.alias.length);
  for(const {key,alias} of aliases){
    const escaped=alias.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,"\\s+");
    const re=new RegExp(`(\\s[-–—]\\s*)${escaped}(?=\\s*$)`,`i`);
    if(re.test(text)) return text.replace(re,(_,sep)=>`${sep}${displayBrand(key)}`);
  }
  // Se a marca vier após "-" e ainda não estiver no mapa, aplica uma
  // capitalização elegante ao sufixo e a usa como candidata de marca.
  const candidate=extractBrandSuffixCandidate(text);
  if(candidate){
    const re=new RegExp(`(\\s[-–—]\\s*)${candidate.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?=\\s*$)`,`i`);
    return text.replace(re,(_,sep)=>`${sep}${titleCaseBrand(candidate)}`);
  }
  return text;
}
function formatProductName(value){
  return formatBrandSuffixInProductName(sentenceCasePtBr(value,"Produto"));
}
function formatProductText(value){
  return sentenceCasePtBr(value,"");
}
function formatDisplayLabel(value){
  return sentenceCasePtBr(value,"");
}

const demoProducts = [
  {id:"demo-1",name:"Gel Construtor Premium",area:"unhas",category:"géis",price:89.90,stock:12,brand:"Relpps",image:"",description:"Gel construtor de alta performance para acabamento profissional.",variations:{Cor:["Natural","Clear","Pink"],Tamanho:["15g","30g"]},variationDeltas:{"30g":25,"Pink":5}},
  {id:"demo-2",name:"Cola Ultra Precision",area:"cilios",category:"colas",price:54.90,stock:18,brand:"Pro Nails",image:"",description:"Adesivo de precisão para profissionais. Secagem rápida e controle.",variations:{Velocidade:["Rápida","Média"],Tamanho:["5ml","10ml"]},variationDeltas:{"10ml":18,"Rápida":4}},
  {id:"demo-3",name:"Preparador Prime",area:"unhas",category:"preparadores",price:39.90,stock:24,brand:"Relpps",image:"",description:"Preparação da unha com toque profissional e acabamento limpo.",variations:{Tamanho:["10ml","15ml"]},variationDeltas:{"15ml":8}},
  {id:"demo-4",name:"Finalizador Bad Pink",area:"cilios",category:"finalizadores",price:49.90,stock:21,brand:"BadPink",image:"",description:"Finalizador Bad Pink para finalização profissional de cílios.",variations:{Tamanho:["10ml","15ml"],Acabamento:["Brilho","Ultra Brilho"]},variationDeltas:{"15ml":8,"Ultra Brilho":5}},
  {id:"demo-5",name:"Higienizador Professional",area:"unhas",category:"higienizadores",price:29.90,stock:40,brand:"Relpps",image:"",description:"Higienizador para rotina profissional.",variations:{Tamanho:["100ml","250ml"]},variationDeltas:{"250ml":12}},
  {id:"demo-6",name:"Esmalte Nude Elegance",area:"unhas",category:"esmaltes",price:24.90,stock:30,brand:"Bluwe",image:"",description:"Cor sofisticada para resultados delicados e elegantes.",variations:{Cor:["Nude","Rosé","Caramelo"]},variationDeltas:{"Rosé":2,"Caramelo":2}},
  {id:"demo-7",name:"Kit Ferramentas Pro",area:"equipamentos",category:"ferramentas",price:119.90,stock:8,brand:"Pro Nails",image:"",description:"Kit para profissionais com seleção de ferramentas essenciais.",variations:{Kit:["Básico","Completo"]},variationDeltas:{"Completo":35}},
  {id:"demo-8",name:"Combo Essenciais Relpps",area:"unhas",category:"combos",price:149.90,stock:6,brand:"Relpps",image:"",description:"Combo pensado para renovar a bancada com os essenciais.",variations:{Combo:["Classic","Premium"]},variationDeltas:{"Premium":35}},
  {id:"demo-9",name:"Top Coat Selante Profissional",area:"unhas",category:"top coat",price:34.90,stock:16,brand:"Relpps",image:"",description:"Top coat e selante para unhas com acabamento profissional.",variations:{Tamanho:["10ml","15ml"],Acabamento:["Brilho","Fosco"]},variationDeltas:{"15ml":7,"Fosco":2}},
];

let products = demoProducts.map(p=>({...p,
  name:formatProductName(p.name),
  description:formatProductText(p.description),
  brand:formatBrandName(p.brand)
}));
let cart = [];
let activeProduct = null;
let selectedVariations = {};
let currentArea = "";
let currentCategory = "";
let currentBrand = "";
let currentSearch = "";
let cartPageReceiveMode = "delivery";
let pendingCheckout = false;
const PRODUCTS_PER_PAGE = 50;
let currentPage = 1;
let shippingQuotes = {melhor_envio:[], uber:null};
let selectedShipping = null;
let lastCreatedOrder = null;
let checkoutPayment = null;
let checkoutCoupon = null;
let checkoutUseSavedData = true;
let minhaRelppsOrigin = {scrollY:0, hash:""};
const CHECKOUT_TEST_MODE = window.RELPPS_CONFIG?.CHECKOUT_TEST_MODE !== false;

function whatsappLink(text="Olá! Vim pelo site da Relpps Cosméticos e gostaria de atendimento.") {
  const n = (window.RELPPS_CONFIG?.WHATSAPP_NUMBER || "").replace(/\D/g,"");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : "#";
}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)}

function classifyArea(p){
  const raw=slug([
    p?.nome,p?.descricao,p?.descricaoCurta,p?.descricaoComplementar,
    p?.categoria?.descricao,p?.categoria?.nome,p?.marca?.descricao,p?.marca
  ].filter(Boolean).join(" "));
  // Finalizadores são separados por técnica. Bad Pink é de cílios.
  if(/finalizador/.test(raw) && /bad\s*pink|badpink/.test(raw)) return "cilios";
  // O finalizador Master Elite identificado no catálogo é para sobrancelhas.
  if(/finalizador/.test(raw) && /master elite|masterelite/.test(raw)) return "sobrancelhas";
  if(/finalizador/.test(raw) && /sobrancelha|sobrancelhas|brow|brow lamination|laminacao|henna/.test(raw)) return "sobrancelhas";
  if(/cilios|cilio|lash|lashes|fio a fio|volume russo|volume brasileiro|curvatura|mapping|extensao de cilios|extensao de cilio|designer de cilios|pinça.*cilio|cola.*cilio|removedor.*cilio/.test(raw)) return "cilios";
  if(/sobrancelha|sobrancelhas|brow|henna|laminacao|laminacao de sobrancelha|design de sobrancelha|pinça.*sobrancelha|paquimetro.*brow/.test(raw)) return "sobrancelhas";
  if(/equipamento|cabine|luminaria|luminária|motor|micromotor|autoclave|esterilizador|aspirador|exaustor|mesa|cadeira|suporte|organizador|aparelho|maquina|máquina|secador|lampada|lâmpada|ring light|broca|alicate|lixa eletrica|lixa elétrica/.test(raw)) return "equipamentos";
  if(/unha|unhas|nail|nails|gel|esmalte|manicure|alongamento|fibra|tips|tip|prep|primer|finalizador|top coat|topcoat|selante|builder|polygel|acrigel|cuticula|cutícula/.test(raw)) return "unhas";
  return "equipamentos";
}

function classifySubcategory(p, area){
  const raw=slug([p?.categoria?.descricao,p?.categoria?.nome,p?.nome,p?.descricao,p?.descricaoCurta].filter(Boolean).join(" "));
  // Kits/combo são uma forma de compra, mas mantêm a área (unhas, cílios ou sobrancelhas).
  if(/\bkit\b|\bcombo\b|\bset\b/.test(raw)) return "kits";
  const map={
    unhas:[
      ["géis",/\bgel\b|builder|base coat|rubber/],["polygel",/polygel|acrigel|acrilico|acril/],["esmaltes",/esmalte|nail polish|gel color|coloracao/],["preparadores",/primer|prep|preparador|desidrat|ph|bactericida/],["top coat",/top coat|topcoat|selante|finalizador|brilho/],["lixas",/lixa|broca|bit|ponteira/],["moldes",/fibra|tips|molde|dual form/],["acessórios",/decor|strass|acessorio|glitter|po/],["ferramentas",/alicate|pinça|espátula|palito|ferramenta/],["equipamentos",/cabine|lixadeira|sugador|motor|aspirador/]
    ],
    cilios:[
      ["finalizadores",/finalizador|selante|sealant|coating/],
      ["tufinhos",/tufinho|tufo/],["colas",/cola|adesivo/],["removedores",/removedor|remover/],["pinças",/pinça|pinca/],["fita",/fita|pad|patch|micropore/],["preparadores",/primer|cleanser|higien|preparador|pre treatment/],["acessórios",/anel|escovinha|microbrush|aplicador|acessorio/],["cílios",/cilio|fio a fio|volume|lash/]
    ],
    sobrancelhas:[
      ["henna",/henna|pigment/],["laminação",/lamin|brow lift/],["tintura",/tintura|tinta|coloracao|oxidante/],["design",/design|mapping|marcacao/],["laminas",/lamina|agulha|tebori/],["pinças",/pinça|pinca/],["cuidados",/serum|care|tratamento|fixador|finalizador/],["acessórios",/acessorio|paquimetro|regua|linha/]
    ],
    equipamentos:[
      ["cabines",/cabine|uv|led/],["luminarias",/luminaria|ring light|luz/],["aspiradores",/aspirador|sugador|exaustor/],["motores",/lixadeira|motor|micromotor/],["ferramentas",/alicate|pinça|pinca|ferramenta/],["acessórios",/suporte|acessorio/]
    ]
  };
  for(const [name,re] of (map[area]||[])) if(re.test(raw)) return name;
  const known=[["higienizadores",/higieniz|clean|limpeza/],["combos",/kit|combo/],["colas",/cola|adesivo/]];
  const hit=known.find(([,re])=>re.test(raw));
  return hit?hit[0]:slug(p?.categoria?.descricao||p?.categoria?.nome||"outros");
}
function getParentId(p){
  const id= p?.idProdutoPai ?? p?.produtoPai?.id ?? p?.pai?.id ?? p?.produtoPaiId ?? p?.parentId;
  if(id==null || id==="" || String(id)===String(p?.id)) return String(p?.id);
  return String(id);
}

const VARIANT_COLOR_WORDS = [
  "transparente","clear","natural","nude","rose","rosé","rosa","pink","magenta","fucsia","fúcsia","vermelho","vermelha","azul","verde","amarelo","amarela","laranja","roxo","roxa","violeta","lilas","lilás","marrom","preto","preta","branco","branca","bege","caramelo","vinho","bordo","bordô","coral","cinza","grafite","dourado","dourada","prata","prateado","metalico","metálico","perolado","perolada","neon","cobre","bronze","chocolate","cappuccino","cafe","café","lavanda","marsala","terracota","terracotta","pessego","pêssego","salmao","salmão","turquesa","menta","aqua","água","off white","ivory","marfim"
];

function titleVariationName(name){
  const n=slug(name);
  const map={cor:"Cor",color:"Cor",tom:"Cor",shade:"Cor",tamanho:"Tamanho",size:"Tamanho",modelo:"Modelo",model:"Modelo",comprimento:"Comprimento",length:"Comprimento",curvatura:"Curvatura",espessura:"Espessura",volume:"Volume",voltagem:"Voltagem",velocidade:"Velocidade",unidade:"Unidade",kit:"Kit",quantidade:"Quantidade",fragrancia:"Fragrância",acabamento:"Acabamento"};
  return map[n]||formatDisplayLabel(name);
}

function cleanVariantName(name){ return String(name||"").replace(/\s+/g," ").trim(); }
function normVariant(v){ return cleanVariantName(v).replace(/\s*\/\s*/g,"/"); }
function addVar(out,key,value){
  value=normVariant(value); if(!value) return;
  if(!out[key]) out[key]=[];
  if(!out[key].some(x=>slug(x)===slug(value))) out[key].push(value);
}
function finalizeVars(out){
  const result={}; Object.entries(out).forEach(([k,vals])=>{if(vals?.length) result[k]=vals.join(" / ");}); return result;
}

// Lê variações diretamente do nome sem transformar características que identificam produtos
// diferentes (por exemplo 4D, 5D, volume russo, clássico etc.).
function inferNameVariation(name, area=""){
  const original=cleanVariantName(name);
  const a=slug(area);
  const out={}; let rest=` ${original} `;
  const take=(regex,key,formatter=v=>v)=>{
    rest=rest.replace(regex,(full,...args)=>{ const value=formatter(args[0]??full,args,full); addVar(out,key,value); return " "; });
  };

  // Cores/códigos explícitos. Mantém 4D/5D como identidade, não como variação.
  take(/(?:\bcor\s*[:#-]?\s*|\btom\s*[:#-]?\s*|\bcor\s+n[ºo]?\s*)(\d{1,4})(?=\b)/gi,"Cor",v=>`Cor ${v}`);
  take(/(?<![A-Za-z0-9])#(\d{1,4})(?=\b)/g,"Cor",v=>`#${v}`);
  take(/(?:\bn[ºo]?\s*)(\d{1,4})(?=\b)/gi,"Cor",v=>`Nº ${v}`);

  const colorPattern=new RegExp(`(?:^|[\\s\\-–—/|,(])(${VARIANT_COLOR_WORDS.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")})(?=$|[\\s\\-–—/|,)])`,`ig`);
  rest=rest.replace(colorPattern,(m,color)=>{ addVar(out,"Cor",color); return " "; });

  // Embalagem e tamanhos: ml, g, kg, oz, L, P/M/G etc.
  take(/\b(\d+(?:[.,]\d+)?)\s*(ml|g|kg|oz|l)\b/gi,"Tamanho",(n,args)=>`${String(n).replace(',','.')}${String(args[1]).toLowerCase()}`);
  take(/(?:^|\s)(PP|P|M|G|GG|XG|XXG|XS|XL|XXL)(?=$|\s|[\-–—/|,])/gi,"Tamanho",v=>String(v).toUpperCase());
  take(/\b(\d+(?:[.,]\d+)?)\s*(cm|m)\b/gi,"Tamanho",(n,args)=>`${String(n).replace(',','.')}${String(args[1]).toLowerCase()}`);

  // Cílios: comprimento, espessura e curvatura.
  if(a==="cilios"){
    // Faixas e mixes: 8-14mm, 8 a 14 mm, 8/10/12mm.
    take(/\b(\d+(?:[.,]\d+)?)\s*(?:-|–|a|até|to)\s*(\d+(?:[.,]\d+)?)\s*mm\b/gi,"Comprimento",(n,args)=>`${String(n).replace(',','.')}–${String(args[1]).replace(',','.')}mm`);
    take(/\b(\d{1,2}(?:\s*\/\s*\d{1,2}){1,5})\s*mm\b/gi,"Comprimento",v=>`${String(v).replace(/\s/g,'')}mm`);
    take(/\b(\d+(?:[.,]\d+)?)\s*mm\b/gi,"Comprimento",v=>`${String(v).replace(',','.')}mm`);
    take(/\b0?[.,](03|04|05|06|07|08|10|12|15|18|20)\b/g,"Espessura",v=>`0.${String(v).replace(/^0?[.,]/,'')}`);
    // C, CC, D, DD, J, B, L, L+, M. Não pega 4D/5D porque há fronteira antes.
    take(/(?:^|\s)(CC|DD|L\+|J|B|C|D|L|M)(?=$|\s|[\-–—/|,])/gi,"Curvatura",v=>String(v).toUpperCase());
  } else {
    take(/\b(\d+(?:[.,]\d+)?)\s*mm\b/gi,"Tamanho",v=>`${String(v).replace(',','.')}mm`);
  }

  // Voltagem e potência de equipamentos.
  take(/\b(110|127|220)\s*(v|volts?)\b/gi,"Voltagem",v=>`${v}V`);
  take(/\b(\d+(?:[.,]\d+)?)\s*(w|watts?)\b/gi,"Potência",(n,args)=>`${String(n).replace(',','.')}${String(args[1]).toUpperCase().startsWith('W')?'W':'W'}`);

  // Quantidade/unidades e packs, quando claramente aparecem como opção no mesmo item.
  take(/\b(\d+)\s*(unidades?|un\.?|pcs?|pares?|pares? de)\b/gi,"Quantidade",(n,args)=>`${n} ${String(args[1]).replace(/\.?$/,'').toUpperCase()}`);

  // Modelo explícito e referências. "Modelo A" vira opção; o restante do produto fica como base.
  take(/\b(?:modelo|model)\s*[:#-]?\s*([A-Za-z0-9]+)\b/gi,"Modelo",v=>String(v).toUpperCase());
  take(/\b(?:ref(?:er[eê]ncia)?|c[oó]d(?:igo)?)\s*[:#-]?\s*([A-Za-z0-9]{2,})\b/gi,"Modelo",v=>String(v).toUpperCase());

  // Remove marcadores genéricos de variação que não fazem parte do nome-base.
  rest=rest.replace(/\b(?:escolha\s+a\s+cor|escolha\s+o\s+tamanho|cor\s+sortida|tamanho\s+sortido|sortido|sortida)\b/gi," ");
  const base=cleanVariantName(rest
    .replace(/\s*([\-–—|,/])\s*/g," ")
    .replace(/\s+/g," ")
    .replace(/^(?:cor|tamanho|modelo)\s*$/i,"")
  );
  return {variations:finalizeVars(out), base};
}

function extractVariationObject(p){
  const candidates=[p?.variacao,p?.variacoes,p?.atributos,p?.grade,p?.variations,p?.variation,p?.raw?.variacao,p?.raw?.variacoes,p?.raw?.atributos,p?.raw?.grade];
  for(const obj of candidates){
    if(obj && typeof obj==="object" && !Array.isArray(obj)){
      const out={}; Object.entries(obj).forEach(([k,v])=>{if(v!=null && typeof v!=="object") out[titleVariationName(k)]=String(v);});
      if(Object.keys(out).length) return out;
    }
  }
  const out={};
  ["cor","color","tom","tamanho","voltagem","potencia","modelo","curvatura","espessura","comprimento","volume","velocidade","unidade","quantidade","kit","acabamento"].forEach(k=>{
    if(p?.[k]!=null && typeof p[k]!=="object") out[titleVariationName(k)]=String(p[k]);
  });
  if(Object.keys(out).length) return out;
  return inferNameVariation(p?.nome||p?.name||p?.descricao||"", p?.area||classifyArea(p)).variations;
}

function inferredGroupBase(p){
  const area=p?.area||classifyArea(p);
  const info=inferNameVariation(p?.name||p?.nome||p?.descricao||"",area);
  let base=slug(info.base||p?.name||p?.nome||p?.descricao||"").replace(/[^a-z0-9]+/g," ").trim();
  // Só normalizações seguras: não remove 4d/5d, marcas, linhas ou nomes próprios.
  base=base.replace(/\b(?:com|para|de|da|do)\b/g," ").replace(/\s+/g," ").trim();
  return base;
}

function productIdentityKey(p){
  const brand=slug(p?.brand||"").trim()||"sem-marca";
  const area=slug(p?.area||"");
  const category=slug(p?.category||"");
  return `${brand}|${area}|${category}|${inferredGroupBase(p)}`;
}

function variationLabel(child,parentName){
  const attrs=extractVariationObject(child);
  if(Object.keys(attrs).length) return Object.entries(attrs).map(([k,v])=>`${k}: ${v}`).join(" • ");
  const name=String(child?.name||child?.nome||child?.descricao||"").trim();
  const base=String(parentName||"").trim(); let label=name;
  if(base && slug(name).startsWith(slug(base))) label=name.slice(base.length).replace(/^[-–—|:/]+/g,"").trim();
  return formatBrandSuffixInProductName(formatDisplayLabel(label||String(child?.codigo||child?.id||"Variação")));
}

function isBadPinkFinalizerName(name){
  const n=slug(name);
  return /finalizador/.test(n) && /bad\s*pink|badpink/.test(n);
}
function normalizeImageMatchText(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
// As fotos de produtos vêm exclusivamente do Bling. Não há fallback para fotos locais.
function localCatalogImageFor(productOrName, fallback){ return fallback || safeImageFallback(); }
function productImageFor(name, blingImage, brand="", fallback=""){
  return blingImage || fallback || safeImageFallback();
}

function blingText(value){
  if(value===null||value===undefined)return "";
  if(typeof value==="string")return value.trim();
  if(typeof value==="object")return String(value.descricao||value.nome||value.texto||"").trim();
  return String(value).trim();
}
function productDescriptionFromRaw(p,fallback){
  const candidates=[p?.descricao,p?.descricaoComplementar,p?.descricaoCurta,p?.descricaoDetalhada,p?.observacoes,p?.texto].map(blingText).filter(Boolean);
  const unique=[...new Set(candidates.map(v=>formatProductText(v)))].filter(Boolean);
  return unique.join("\n\n")||fallback||"Produto integrado ao catálogo Relpps.";
}
function productRawDetailRows(p){
  const raw=p?.raw||{};
  const brand=p?.brand||blingText(raw?.marca);
  const category=blingText(raw?.categoria);
  const rows=[
    ["Marca",brand||"Relpps"],
    ["Categoria",formatDisplayLabel(p?.category||category||p?.area||"Cosméticos")],
    ["Código",String(raw?.codigo||raw?.codigoPai||p?.id||"—")],
    ["Disponibilidade",(Number(p?.stock)<=5?(Number(p?.stock)>0?"Últimas unidades":"Esgotado"):"Disponível")]
  ];
  const attrs=raw?.dimensoes||raw?.medidas||{};
  if(attrs&&typeof attrs==="object") Object.entries(attrs).forEach(([k,v])=>{if(v!==null&&v!==undefined&&String(v).trim())rows.push([formatDisplayLabel(k),String(v)])});
  return rows;
}

function blingImageUrls(p){
  const urls=[]; const seen=new Set();
  const imageKey=/^(imagem|imagens|imagemurl|urlimagem|imagemprincipal|foto|fotos|image|images|url|link|href|src|arquivo|anexo|media|midia)$/i;
  const looksLikeImage=(x)=>/\.(png|jpe?g|webp|gif|avif|svg)(?:[?#].*)?$/i.test(x)||/bling\.com\.br|cdn|image|imagem|foto/i.test(x);
  const push=(v,key='')=>{
    if(!v)return;
    if(typeof v==='string'){
      const x=v.trim();
      if((/^https?:\/\//i.test(x)||x.startsWith('./')||x.startsWith('/')) && (imageKey.test(String(key))||looksLikeImage(x)) && !seen.has(x)){
        seen.add(x); urls.push(x);
      }
      return;
    }
    if(Array.isArray(v)){v.forEach(item=>push(item,key));return;}
    if(typeof v==='object'){
      for(const [k,val] of Object.entries(v)){
        if(imageKey.test(k) || typeof val==='object') push(val,k);
      }
    }
  };
  // Campos conhecidos do Bling + varredura profunda para diferenças entre respostas.
  ['imagem','imagemUrl','urlImagem','imagemPrincipal','imagens','fotos','anexos','midias','media','images'].forEach(k=>push(p?.[k],k));
  if(!urls.length) push(p,'root');
  return urls;
}

function blingImageProxy(url){
  const raw=String(url||"").trim();
  if(!/^https?:\/\//i.test(raw)) return raw;
  try{
    const u=new URL(raw);
    const host=u.hostname.toLowerCase();
    const isBling=host==='bling.com.br'||host.endsWith('.bling.com.br')||host==='blingcdn.com'||host.endsWith('.blingcdn.com');
    // O navegador não acessa diretamente algumas imagens/CDNs do Bling. Para esses
    // hosts usamos a Function, que busca a foto no servidor com o OAuth do Bling.
    return isBling ? `/api/bling?action=image&url=${encodeURIComponent(u.toString())}` : u.toString();
  }catch{return raw;}
}
function imageCandidates(p){
  // Prefere a imagem original do Bling e deixa miniaturas/URLs com resize por último.
  // Isso evita que o catálogo escolha uma thumbnail pequena e pareça borrada no PC ou mobile.
  const urls=blingImageUrls(p).map(blingImageProxy).filter(Boolean);
  const score=(url)=>{
    const x=String(url).toLowerCase();
    let n=0;
    if(!/(?:thumb|thumbnail|miniatura|preview|small|(?:^|[?&])w=|(?:^|[?&])h=|width=|height=|resize|size=)/.test(x)) n+=100;
    if(/original|full|large|alta|high|quality/.test(x)) n+=20;
    if(/\.png(?:$|\?)|\.webp(?:$|\?)/.test(x)) n+=2;
    return n;
  };
  return [...new Set(urls)].sort((a,b)=>score(b)-score(a));
}
function safeImageFallback(){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="#f7f7f5"/><circle cx="400" cy="340" r="120" fill="#eceae5"/><path d="M320 520h160" stroke="#b08a55" stroke-width="10" stroke-linecap="round"/><text x="400" y="590" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="#6b6258">Imagem do produto no Bling</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function normalizeBlingProduct(p){
  const estoque=Number(p?.estoque?.saldoVirtualTotal ?? p?.estoque?.saldoFisicoTotal ?? p?.estoque?.saldo ?? p?.saldoVirtual ?? p?.saldo ?? 0);
  const price=Number(p?.preco ?? p?.precoVenda ?? p?.precoVendaVarejo ?? 0);
  const name=formatProductName(p?.nome ?? p?.descricao ?? "Produto");
  const area=classifyArea(p); const category=classifySubcategory(p,area);
  const imageUrls=imageCandidates(p);
  const rawBrand=p?.marca?.descricao||p?.marca?.nome||((typeof p?.marca==="string")?p.marca:"");
  const fallback=safeImageFallback();
  const image=productImageFor(name, imageUrls[0]||"", rawBrand, fallback);
  const sourceText=[name,p?.descricao,p?.descricaoCurta,p?.categoria?.descricao,p?.categoria?.nome].filter(Boolean).join(" ");
  const brandKeyResolved=canonicalBrandKey(rawBrand)||inferBrandFromText(sourceText);
  const suffixBrand=extractBrandSuffixCandidate(p?.nome||p?.descricao||"");
  // Prioridade: marca oficial do Bling > marca conhecida no texto > marca no final do nome após "-".
  const brand=brandKeyResolved ? displayBrand(brandKeyResolved) : "";
  return {id:String(p.id),name,area,category,price,stock:estoque,brand,image,images:imageUrls.length?imageUrls:[image],description:productDescriptionFromRaw(p,"Produto integrado ao catálogo Relpps."),variations:{},variationItems:[],parentId:getParentId(p),raw:p};
}

function makeVariationItem(item,parentName){
  const inferred=inferNameVariation(item.name,item.area);
  return {id:item.id,label:variationLabel(item,parentName),price:Number(item.price)||0,stock:Number(item.stock)||0,variations:extractVariationObject(item),image:item.image,base:inferred.base};
}
function buildVariationGroups(items){
  const groups={};
  items.forEach(item=>Object.entries(item.variations||{}).forEach(([name,value])=>{
    if(!groups[name]) groups[name]=[];
    if(!groups[name].some(v=>slug(v)===slug(value))) groups[name].push(value);
  }));
  return groups;
}
function sortVariationGroups(groups){
  const order={"Comprimento":0,"Espessura":1,"Curvatura":2,"Cor":3,"Tamanho":4,"Modelo":5,"Volume":6,"Quantidade":7,"Voltagem":8,"Potência":9};
  return Object.fromEntries(Object.entries(groups).sort(([a],[b])=>(order[a]??99)-(order[b]??99)||a.localeCompare(b,"pt-BR")));
}
function makeGroupedProduct(items, preferredParent=null){
  const ordered=[...items].sort((a,b)=>(Number(b.stock)||0)-(Number(a.stock)||0));
  const lead=preferredParent||ordered[0];
  const info=inferNameVariation(lead.name,lead.area);
  const baseName=formatProductName(cleanVariantName(info.base)||lead.name);
  const variationItems=ordered.map(x=>makeVariationItem(x,baseName));
  const groups=sortVariationGroups(buildVariationGroups(variationItems));
  if(!Object.keys(groups).length) return null;
  const prices=items.map(x=>Number(x.price)||0).filter(x=>x>0);
  return {...lead,id:lead.id,name:baseName,price:prices.length?Math.min(...prices):Number(lead.price)||0,stock:items.reduce((sum,x)=>sum+Math.max(0,Number(x.stock)||0),0),variationItems,variations:groups};
}

function groupBlingProducts(rawProducts){
  const source=rawProducts.filter(p=>{
    const status=String(p?.situacao?.descricao??p?.situacao??p?.status??"").trim().toLowerCase();
    if(!status) return true;
    return !["i","inativo","inactive","desativado","desativada"].includes(status);
  });
  const normalized=source.map(normalizeBlingProduct);
  const explicit=new Map();
  normalized.forEach(p=>{const key=p.parentId||p.id;if(!explicit.has(key))explicit.set(key,[]);explicit.get(key).push(p);});
  const stage=[];
  for(const [key,items] of explicit){
    const parent=items.find(x=>String(x.id)===String(key));
    const grouped=items.length>1?makeGroupedProduct(items,parent||items[0]):null;
    stage.push(grouped||items[0]);
  }

  // Segunda camada: agrupa produtos que foram cadastrados soltos, mas só quando
  // marca + área + subcategoria + nome-base coincidirem exatamente.
  const buckets=new Map();
  stage.forEach(p=>{
    if(p.variationItems?.length){buckets.set(`fixed:${p.id}`,[p]);return;}
    const key=productIdentityKey(p); if(!buckets.has(key)) buckets.set(key,[]); buckets.get(key).push(p);
  });
  const final=[];
  for(const [key,items] of buckets){
    if(key.startsWith("fixed:")||items.length===1){final.push(items[0]);continue;}
    const grouped=makeGroupedProduct(items);
    // Nunca une "produtos diferentes" sem uma variação real identificada.
    final.push(grouped||items[0]);
    if(!grouped) final.push(...items.slice(1));
  }
  return final;
}

function applyProductSource(rawProducts, sourceLabel="catálogo"){
  if(!Array.isArray(rawProducts) || !rawProducts.length) return false;
  products = groupBlingProducts(rawProducts);
  try{
    const imageCache=JSON.parse(localStorage.getItem("relpps-bling-image-cache")||"{}");
    products.forEach(p=>{const urls=imageCache[String(p.id)];if(Array.isArray(urls)&&urls.length){p.images=urls;p.image=urls[0];}});
  }catch{}
  rebuildAreaFilter();
  rebuildCategoryFilter();
  rebuildBrandFilter();
  renderProducts();
  document.documentElement.dataset.productSource=sourceLabel;
  return true;
}

async function hydrateBlingProductImages(){
  if(!window.RELPPS_CONFIG?.BLING_API_ENABLED || !Array.isArray(products) || !products.length) return;
  const ids=products.map(p=>String(p?.id||'')).filter(id=>id && !id.startsWith('demo-'));
  if(!ids.length) return;
  const cacheKey='relpps-bling-image-cache';
  let cache={};
  try{cache=JSON.parse(localStorage.getItem(cacheKey)||'{}')||{};}catch{}
  let changed=false;
  products.forEach(p=>{
    const urls=cache[String(p.id)];
    if(Array.isArray(urls)&&urls.length){
      p.images=urls.map(blingImageProxy).filter(Boolean);
      p.image=p.images[0]||p.image;
      changed=true;
    }
  });
  if(changed) renderProducts();

  const missing=ids.filter(id=>!Array.isArray(cache[id])||!cache[id].length);
  const batchSize=18;
  for(let start=0;start<missing.length;start+=batchSize){
    const batch=missing.slice(start,start+batchSize);
    try{
      const res=await fetch(`/api/bling?action=product-images&ids=${encodeURIComponent(batch.join(','))}`,{headers:{Accept:'application/json'}});
      if(!res.ok) continue;
      const data=await res.json();
      const map=data?.images||{};
      let batchChanged=false;
      for(const [id,urls] of Object.entries(map)){
        if(!Array.isArray(urls)||!urls.length) continue;
        cache[id]=urls;
        const product=products.find(p=>String(p.id)===String(id));
        if(product){
          product.images=urls.map(blingImageProxy).filter(Boolean);
          if(product.images.length){product.image=product.images[0];batchChanged=true;}
        }
      }
      if(batchChanged){renderProducts();changed=true;}
      try{localStorage.setItem(cacheKey,JSON.stringify(cache));}catch{}
    }catch(e){console.info('Bling: falha ao hidratar fotos do lote',e);}
  }
  if(changed) try{localStorage.setItem('relpps-bling-products-cache',JSON.stringify(products));}catch{}
}

async function loadProducts(){
  const cached=Array.isArray(window.RELPPS_BLING_CACHE)?window.RELPPS_BLING_CACHE:[];
  if(cached.length) applyProductSource(cached,"cache");
  if(!window.RELPPS_CONFIG?.BLING_API_ENABLED) return;
  try{
    const res=await fetch("/api/bling?action=products",{headers:{"Accept":"application/json"}});
    if(!res.ok) throw new Error("API");
    const data=await res.json();
    if(Array.isArray(data.products) && data.products.length){
      applyProductSource(data.products,"bling");
      try{localStorage.setItem("relpps-bling-products-cache",JSON.stringify(data.products));}catch{}
    }
  }catch(e){
    try{
      const saved=JSON.parse(localStorage.getItem("relpps-bling-products-cache")||"[]");
      if(Array.isArray(saved)&&saved.length){applyProductSource(saved,"localStorage");}
    }catch{}
    console.info("Bling indisponível — usando catálogo em cache.", e);
  }
}

function productSearchText(p){
  const variationText = Object.entries(p?.variations||{})
    .flatMap(([name, values]) => [name, ...(Array.isArray(values) ? values : [])]).join(" ");
  const variationItems = (p?.variationItems||[]).flatMap(v=>[v?.label,...Object.values(v?.variations||{})]).join(" ");
  const raw = [p?.name,p?.area,p?.category,p?.brand,p?.description,p?.id,variationText,variationItems,p?.raw?.nome,p?.raw?.codigo]
    .filter(Boolean).join(" ");
  return slug(raw).replace(/[^a-z0-9]+/g," ").trim();
}

function filteredProducts(){
  const q=slug(currentSearch).replace(/[^a-z0-9]+/g," ").trim();
  const terms=q.split(/\s+/).filter(Boolean);
  const area=slug(currentArea), cat=slug(currentCategory), brand=canonicalBrandKey(currentBrand);
  return products.filter(p=>{
    const areaOk=!area || slug(p?.area)===area;
    const isKit=/\bkit\b|\bcombo\b|\bset\b/.test(slug(`${p?.name||""} ${p?.category||""}`));
    const catOk=!cat || (cat==="kits" ? isKit : slug(p?.category)===cat);
    const brandText=canonicalBrandKey(p?.brand)||inferBrandFromText([p?.name,p?.description].filter(Boolean).join(" "));
    // Marca é comparação exata por chave canônica. Não usa "includes", para nunca misturar marcas parecidas.
    const brandOk=!brand || (!!brandText && brandText===brand);
    if(!areaOk || !catOk || !brandOk) return false;
    if(!terms.length) return true;
    const text=productSearchText(p), phrase=terms.join(" ");
    return text.includes(phrase) || terms.every(term=>text.includes(term));
  });
}

function syncCatalogFilters(){
  const areaSelect=$("#areaFilter"), categorySelect=$("#categoryFilter"), brandSelect=$("#brandFilter");
  if(areaSelect) areaSelect.value=currentArea||"";
  if(categorySelect) categorySelect.value=currentCategory||"";
  if(brandSelect) brandSelect.value=currentBrand||"";
  if($("#catalogSearch")) $("#catalogSearch").value=currentSearch;
  $$(".catalog-chip").forEach(chip=>{
    const chipArea=slug(chip.dataset.filterArea||"");
    const chipCategory=slug(chip.dataset.filterCategory||"");
    const activeArea=slug(currentArea||"");
    const activeCategory=slug(currentCategory||"");
    // Só ativa quando os dois níveis da navegação coincidirem.
    // "Unhas" não marca automaticamente "Kits Unhas" ou "Top Coat".
    chip.classList.toggle("active",chipArea===activeArea && chipCategory===activeCategory);
  });
}

function rebuildBrandFilter(){
  const select=$("#brandFilter");
  const known=[];
  const seen=new Set();
  products.forEach(p=>{
    const key=canonicalBrandKey(p?.brand)||inferBrandFromText([p?.name,p?.description].filter(Boolean).join(" "));
    if(key && !seen.has(key)){ seen.add(key); known.push([key,displayBrand(key)]); }
  });
  known.sort((a,b)=>a[1].localeCompare(b[1],"pt-BR"));
  if(select){
    const selected=canonicalBrandKey(currentBrand);
    select.innerHTML='<option value="">Todas as marcas</option>'+known.map(([key,name])=>`<option value="${key}">${name}</option>`).join("");
    select.value=known.some(([key])=>key===selected)?selected:"";
  }
  const track=$(".brand-track");
  if(track){
    const buttons=known.map(([key,name])=>`<button type="button" data-brand-filter="${key}">${name}</button>`).join("");
    track.innerHTML=buttons + buttons.replace(/<button /g,'<button aria-hidden="true" tabindex="-1" ');
  }
}

function rebuildCategoryFilter(){
  const select=$("#categoryFilter"); if(!select)return;
  const preferred=["Géis","Colas","Preparadores","Esmaltes","Top Coat","Finalizadores","Higienizadores","Ferramentas","Kits","Combos","Cílios","Henna","Laminação","Sobrancelhas"];
  const actual=products.map(p=>String(p?.category||"").trim()).filter(Boolean);
  const cats=[...new Map([...preferred,...actual].map(name=>[slug(name),name])).values()];
  select.innerHTML='<option value="">Todas as categorias</option>'+cats.map(name=>`<option value="${slug(name)}">${name}</option>`).join("");
  select.value=currentCategory||"";
}

function rebuildAreaFilter(){
  const select=$("#areaFilter"); if(!select)return;
  const areas=["Unhas","Cílios","Sobrancelhas","Outros"];
  select.innerHTML='<option value="">Todas as áreas</option>'+areas.map(name=>`<option value="${slug(name)}">${name}</option>`).join("");
  select.value=currentArea||"";
}

function resetCatalogPage(){ currentPage=1; }
function renderCatalogPagination(totalPages, totalItems){
  const nav=$("#catalogPagination"); if(!nav)return;
  nav.innerHTML="";
  nav.classList.toggle("hidden", totalItems<=PRODUCTS_PER_PAGE);
  if(totalPages<=1)return;
  const add=(label,page,opts={})=>{
    const b=document.createElement("button"); b.type="button"; b.textContent=label;
    if(opts.active)b.classList.add("active"); if(opts.disabled)b.disabled=true;
    b.setAttribute("aria-label", opts.aria||label); b.dataset.page=page; nav.appendChild(b);
  };
  add("‹",Math.max(1,currentPage-1),{disabled:currentPage===1,aria:"Página anterior"});
  const pages=[];
  for(let p=1;p<=totalPages;p++){
    if(p===1||p===totalPages||Math.abs(p-currentPage)<=2) pages.push(p);
  }
  let last=0;
  pages.forEach(p=>{ if(p-last>1){ const s=document.createElement("span"); s.textContent="…"; nav.appendChild(s); } add(String(p),p,{active:p===currentPage,aria:`Ir para a página ${p}`}); last=p; });
  add("›",Math.min(totalPages,currentPage+1),{disabled:currentPage===totalPages,aria:"Próxima página"});
}
let imageHydrationRun=0;
async function hydratePageImages(pageList){
  if(!window.RELPPS_CONFIG?.BLING_API_ENABLED || !Array.isArray(pageList) || !pageList.length) return;
  const run=++imageHydrationRun;
  // Só busca detalhes dos produtos que ainda não têm uma imagem real.
  const targets=pageList.filter(p=>!Array.isArray(p.images)||!p.images.some(Boolean)||String(p.image||'').startsWith('data:image/svg+xml'));
  const ids=targets.map(p=>String(p.id)).filter(Boolean);
  const batchSize=12;
  const cache={};
  try{
    const batches=[];
    for(let i=0;i<ids.length;i+=batchSize) batches.push(ids.slice(i,i+batchSize));
    await Promise.all(batches.map(async batch=>{
      if(run!==imageHydrationRun) return;
      try{
        const r=await fetch(`/api/bling?action=product-images&ids=${encodeURIComponent(batch.join(","))}`,{headers:{"Accept":"application/json"}});
        if(!r.ok) return;
        const data=await r.json(); const map=data?.images||{};
        for(const p of targets){
          const urls=Array.isArray(map[String(p.id)])?map[String(p.id)].filter(Boolean):[];
          if(!urls.length) continue;
          p.images=[...new Set(urls)]; p.image=blingImageProxy(p.images[0]); cache[String(p.id)]=p.images;
          const selector=`.product-card [data-view="${CSS.escape(String(p.id))}"] img`;
          const card=document.querySelector(selector);
          if(card){card.onerror=()=>{card.onerror=null;card.src=safeImageFallback()};card.src=p.image;}
        }
      }catch{}
    }));
    try{
      const old=JSON.parse(localStorage.getItem("relpps-bling-image-cache")||"{}");
      localStorage.setItem("relpps-bling-image-cache",JSON.stringify({...old,...cache}));
    }catch{}
  }catch(e){ console.info("Imagens do Bling indisponíveis nesta página.",e); }
}

function renderProducts(){
  const grid=$("#productGrid"), empty=$("#emptyState");
  const list=filteredProducts();
  const totalPages=Math.max(1,Math.ceil(list.length/PRODUCTS_PER_PAGE));
  if(currentPage>totalPages) currentPage=totalPages;
  const pageStart=(currentPage-1)*PRODUCTS_PER_PAGE;
  const pageList=list.slice(pageStart,pageStart+PRODUCTS_PER_PAGE);
  grid.innerHTML="";
  empty.classList.toggle("hidden",list.length>0);
  syncCatalogFilters();
  const count=$("#catalogCount");
  if(count){
    const total=products.length;
    const filteredLabel=list.length===total && !currentSearch && !currentCategory && !currentBrand && !currentArea;
    const base=filteredLabel ? `${total} produtos` : `${list.length} ${list.length===1?"produto":"produtos"} encontrado${list.length===1?"":"s"}`;
    count.textContent=list.length>PRODUCTS_PER_PAGE ? `${base} · mostrando ${pageStart+1}–${Math.min(pageStart+PRODUCTS_PER_PAGE,list.length)} · página ${currentPage}/${totalPages}` : base;
  }
  pageList.forEach(p=>{
    const soldOut = Number(p.stock)<=0;
    const card=document.createElement("article");
    card.className="product-card";
    card.classList.add("reveal-item");
    card.innerHTML=`
      <button class="product-image product-detail-trigger" type="button" data-view="${p.id}" aria-label="Ver detalhes de ${p.name}">
        <img src="${p.image}" alt="${p.name}" loading="eager" fetchpriority="high" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=safeImageFallback()">
        <span class="stock-dot">${soldOut?"Esgotado":(Number(p.stock)<=5?"Últimas unidades":"Disponível")}</span>
      </button>
      <div class="product-info">
        <span class="category">${formatDisplayLabel(p.area||p.category||"")}${p.category&&p.category!==p.area?` · ${formatDisplayLabel(p.category)}`:""}</span>
        <button class="product-name-link" type="button" data-view="${p.id}">${p.name}</button>
        ${variationSummary(p)?`<div class="product-variations-note">${variationSummary(p)}${p.variationItems?.length?` · ${p.variationItems.length} opções`:""}</div>`:""}
        <div class="product-price">${money(p.price)}</div>
        <div class="product-actions">
          <button data-add="${p.id}" ${soldOut?"disabled":""}>${soldOut?"ESGOTADO":"COMPRAR"}</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
  renderCatalogPagination(totalPages,list.length);
  requestAnimationFrame(()=>{
    hydratePageImages(pageList);
  });
  requestAnimationFrame(()=>{
    $$("#productGrid .reveal-item").forEach((el,i)=>{
      el.style.setProperty("--reveal-delay", `${Math.min(i%4,3)*70}ms`);
      requestAnimationFrame(()=>el.classList.add("is-visible"));
    });
  });
}

function variationSummary(p){
  const groups=Object.entries(p?.variations||{});
  if(!groups.length) return "";
  return groups.slice(0,2).map(([name,values])=>{
    const vals=Array.isArray(values)?values:String(values||"").split(/\s*\/\s*/);
    const shown=vals.slice(0,3).join(" · ");
    return `${name}: ${shown}${vals.length>3?" +": ""}`;
  }).join(" • ");
}

function variationItemMatches(item, vars){
  const attrs=item?.variations||{};
  return Object.entries(vars||{}).every(([name,value])=>slug(attrs[name])===slug(value));
}
function getSelectedVariationItem(p, vars){
  if(!p?.variationItems?.length) return null;
  const selected=Object.entries(vars||{}).filter(([,v])=>String(v||"").trim());
  if(!selected.length) return p.variationItems[0];
  return p.variationItems.find(item=>variationItemMatches(item,vars)) || null;
}
function getVariationPrice(p, vars){
  const item=getSelectedVariationItem(p,vars);
  if(item) return Number(item.price)||Number(p.price)||0;
  let delta=0;
  Object.values(vars||{}).forEach(v=>delta += Number(p.variationDeltas?.[v]||0));
  return Number(p.price)+delta;
}
function getVariationStock(p, vars){
  const item=getSelectedVariationItem(p,vars);
  return item ? Number(item.stock)||0 : (p?.variationItems?.length ? 0 : Number(p.stock)||0);
}
function variationValueAvailable(p, groupName, value, vars){
  const candidate={...vars,[groupName]:value};
  return (p?.variationItems||[]).some(item=>variationItemMatches(item,candidate) && Number(item.stock)>0);
}
function refreshVariationAvailability(){
  if(!activeProduct) return;
  $$(".variation-btn",$("#variationArea")).forEach(btn=>{
    const group=btn.closest(".variation-group");
    const name=group?.dataset?.variationName;
    const available=variationValueAvailable(activeProduct,name,btn.dataset.value,selectedVariations);
    btn.disabled=!available;
    btn.classList.toggle("selected",slug(selectedVariations[name])===slug(btn.dataset.value));
  });
}
function openProduct(id){
  const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
  activeProduct=p; selectedVariations={};
  const first=p.variationItems?.find(x=>Number(x.stock)>0) || p.variationItems?.[0];
  if(first?.variations && Object.keys(first.variations).length) selectedVariations={...first.variations};
  else Object.entries(p.variations||{}).forEach(([name,values])=>{if(values?.length) selectedVariations[name]=values[0];});
  $("#modalImage").src=first?.image||p.image; $("#modalImage").alt=p.name;
  $("#modalCategory").textContent=[p.area,p.category].filter(Boolean).map(formatDisplayLabel).join(" · ");
  $("#modalName").textContent=p.name; $("#modalDescription").textContent=p.description||"";
  const area=$("#variationArea"); area.innerHTML="";
  Object.entries(p.variations||{}).forEach(([name,values])=>{
    const group=document.createElement("div"); group.className="variation-group"; group.dataset.variationName=name;
    group.innerHTML=`<h4>${name}</h4><div class="variation-list"></div>`;
    const list=$(".variation-list",group);
    values.forEach(value=>{
      const b=document.createElement("button"); b.type="button"; b.className="variation-btn"; b.textContent=value; b.dataset.value=value;
      b.onclick=()=>{
        selectedVariations[name]=value;
        const item=getSelectedVariationItem(activeProduct,selectedVariations);
        if(item?.image) { $("#modalImage").src=item.image; $("#modalImage").alt=activeProduct.name; }
        refreshVariationAvailability();
        updateModalPrice();
      };
      list.appendChild(b);
    });
    area.appendChild(group);
  });
  refreshVariationAvailability(); updateModalPrice(); $("#productModal").classList.remove("hidden"); document.body.style.overflow="hidden";
}
function updateModalPrice(){
  if(!activeProduct)return;
  const item=getSelectedVariationItem(activeProduct,selectedVariations);
  if(item?.image){$("#modalImage").src=item.image;$("#modalImage").alt=activeProduct.name;}
  const stock=getVariationStock(activeProduct,selectedVariations);
  $("#modalPrice").textContent=money(getVariationPrice(activeProduct,selectedVariations));
  $("#modalStock").textContent=stock>0?(stock>0?(Number(stock)<=5?"Últimas unidades":"Disponível"):"Esgotado"):"Esgotado";
  const add=$("#modalAdd"); if(add) add.disabled=stock<=0;
}

function closeModal(id){$("#"+id).classList.add("hidden");if(id==="accountModal")pendingCheckout=false;document.body.style.overflow="";}

function addToCart(id, vars={}){
  const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
  if(Number(p.stock)<=0){toast("Produto sem estoque.");return;}
  const variationKey=Object.entries(vars).sort().map(([a,b])=>`${a}:${b}`).join("|");
  const variationItem=getSelectedVariationItem(p,vars);
  const selectedStock=variationItem ? Number(variationItem.stock)||0 : Number(p.stock)||0;
  if(selectedStock<=0){toast("Esta variação está sem estoque.");return;}
  const key=`${p.id}::${variationKey}`;
  const existing=cart.find(x=>x.key===key);
  if(existing) existing.qty=Math.min(existing.qty+1,selectedStock);
  else cart.push({key,id:variationItem?.id||p.id,groupId:p.id,name:p.name,image:variationItem?.image||p.image,basePrice:p.price,price:getVariationPrice(p,vars),category:p.category,variations:{...vars},qty:1,stock:selectedStock});
  saveCart(); renderCart(); toast("Produto adicionado ao carrinho.");
}
function saveCart(){localStorage.setItem("relpps-cart",JSON.stringify(cart))}
function loadCart(){try{cart=JSON.parse(localStorage.getItem("relpps-cart")||"[]")||[]}catch{cart=[]}}

let currentProfile = null;
let currentUser = null;
let profileSaveTimer = null;

function cloudReady(){
  return Boolean(
    window.RELPPS_CONFIG?.SUPABASE_ENABLED &&
    window.RELPPS_CONFIG?.SUPABASE_URL &&
    window.RELPPS_CONFIG?.SUPABASE_PUBLISHABLE_KEY &&
    window.supabase?.createClient
  );
}

const supabaseClient = cloudReady()
  ? window.supabase.createClient(
      window.RELPPS_CONFIG.SUPABASE_URL,
      window.RELPPS_CONFIG.SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    )
  : null;

function accountMessage(text, type=""){
  const login = $("#loginStatus"), register = $("#registerStatus");
  if(login) login.textContent = type === "login" ? text : "";
  if(register) register.textContent = type === "register" ? text : "";
}

function requireCloud(){
  if(!cloudReady()){
    toast("O cadastro na nuvem ainda não foi configurado.");
    accountMessage("Configure o Supabase no arquivo config.js antes de usar o cadastro online.", "login");
    return false;
  }
  return true;
}

async function getCloudUser(){
  if(!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getUser();
  return data?.user || null;
}

async function queryProfile(userId){
  // Lê o perfil salvo e, se ele ainda não existir, usa os dados do Auth como fallback.
  const { data, error } = await supabaseClient
    .from("perfis")
    .select("id,nome_completo,cpf,whatsapp,email")
    .eq("id", userId)
    .maybeSingle();
  if(error) return { data:null, table:"perfis", error };

  const meta=currentUser?.user_metadata || {};
  return { data:{
    id:userId,
    email:data?.email || currentUser?.email || meta.email || "",
    name:data?.nome_completo || meta.name || "",
    cpf:data?.cpf || meta.cpf || "",
    phone:data?.whatsapp || meta.phone || ""
  }, table:"perfis", exists:Boolean(data) };
}

async function queryAddress(userId){
  // O projeto aceita a tabela sem acento (enderecos) e também a tabela antiga
  // com acento (endereços), para não perder endereços já cadastrados.
  const tables=["enderecos","endereços"];
  for(const table of tables){
    const { data, error } = await supabaseClient
      .from(table)
      .select("id,user_id,cep,endereco,numero,complemento,bairro,cidade,uf")
      .eq("user_id", userId)
      .order("id", { ascending:false })
      .limit(1)
      .maybeSingle();
    if(!error && data){
      return {
        id:data.id, user_id:data.user_id, cep:data.cep || "",
        address:data.endereco || "", number:data.numero || "",
        complement:data.complemento || "", district:data.bairro || "",
        city:data.cidade || "", uf:data.uf || ""
      };
    }
  }
  return null;
}

async function loadProfile(){
  currentUser = await getCloudUser();
  currentProfile = null;
  if(!currentUser){ updateAccountButton(); return null; }

  const result = await queryProfile(currentUser.id);
  if(result.error){
    console.error("Erro ao carregar perfil:", result.error);
    accountMessage("Não foi possível carregar seus dados. Verifique as tabelas do Supabase.", "login");
    updateAccountButton();
    return null;
  }

  // Se o cadastro foi criado antes da tabela perfis estar pronta, recupera os dados
  // salvos no Auth e cria/atualiza o perfil automaticamente.
  const profile=result.data || {id:currentUser.id,email:currentUser.email||"",name:"",cpf:"",phone:""};
  const meta=currentUser.user_metadata || {};
  const recovered={
    name:profile.name || meta.name || "",
    cpf:profile.cpf || meta.cpf || "",
    phone:profile.phone || meta.phone || "",
    email:profile.email || currentUser.email || meta.email || ""
  };
  if(recovered.name || recovered.cpf || recovered.phone || recovered.email){
    const needsSync=!result.exists || !profile.name || !profile.cpf || !profile.phone || !profile.email;
    if(needsSync){
      const sync=await supabaseClient.from("perfis").upsert({
        id:currentUser.id,
        nome_completo:recovered.name,
        cpf:recovered.cpf,
        whatsapp:recovered.phone,
        email:recovered.email
      },{onConflict:"id"});
      if(sync.error) console.warn("Não foi possível sincronizar perfil:",sync.error);
    }
  }

  const address = await queryAddress(currentUser.id);
  currentProfile = {
    id:currentUser.id,
    email:recovered.email,
    name:recovered.name,
    cpf:recovered.cpf,
    phone:recovered.phone,
    ...(address || {})
  };
  updateAccountButton();
  return currentProfile;
}

const RELPPS_LOYALTY_KEY="relpps-loyalty";
function loyaltyStorageKey(){return `${RELPPS_LOYALTY_KEY}:${currentUser?.id||"guest"}`;}
function defaultLoyalty(){return {points:currentUser?20:0,welcomeGranted:Boolean(currentUser),coupons:[],history:[]};}
function getLoyalty(){try{return {...defaultLoyalty(),...(JSON.parse(localStorage.getItem(loyaltyStorageKey())||"{}"))};}catch{return defaultLoyalty();}}
function saveLoyalty(data){
  localStorage.setItem(loyaltyStorageKey(),JSON.stringify(data));
  // Mantém o navegador rápido e, quando o Supabase estiver configurado, espelha o saldo e os cupons na nuvem.
  if(currentUser && cloudReady()) syncLoyaltyToCloud(data).catch(err=>console.warn("Falha ao sincronizar Club Relpps:",err));
}
async function syncLoyaltyToCloud(data){
  if(!currentUser || !cloudReady()) return;
  const tier=loyaltyTier(Number(data?.points)||0).name;
  const club={user_id:currentUser.id,pontos:Number(data?.points)||0,boas_vindas_concedidas:Boolean(data?.welcomeGranted),nivel:tier,updated_at:new Date().toISOString()};
  const saved=await supabaseClient.from("clube_relpps").upsert(club,{onConflict:"user_id"});
  if(saved.error) throw saved.error;
  for(const coupon of (data?.coupons||[])){
    const row={user_id:currentUser.id,codigo:String(coupon.code||""),valor:Number(coupon.value)||0,usado:Boolean(coupon.used),created_at:coupon.createdAt||new Date().toISOString(),used_at:coupon.usedAt||null};
    if(!row.codigo) continue;
    const found=await supabaseClient.from("clube_relpps_cupons").select("id").eq("codigo",row.codigo).maybeSingle();
    if(found.error) throw found.error;
    const result=found.data?.id ? await supabaseClient.from("clube_relpps_cupons").update(row).eq("id",found.data.id) : await supabaseClient.from("clube_relpps_cupons").insert(row);
    if(result.error) throw result.error;
  }
}
async function loadLoyaltyFromCloud(){
  if(!currentUser || !cloudReady()) return getLoyalty();
  const local=getLoyalty();
  const club=await supabaseClient.from("clube_relpps").select("*").eq("user_id",currentUser.id).maybeSingle();
  if(club.error){console.warn("Não foi possível carregar Club Relpps:",club.error);return local;}
  const coupons=await supabaseClient.from("clube_relpps_cupons").select("*").eq("user_id",currentUser.id).order("created_at",{ascending:false});
  if(coupons.error){console.warn("Não foi possível carregar cupons:",coupons.error);return local;}
  const remote=club.data?{points:Number(club.data.pontos)||0,welcomeGranted:Boolean(club.data.boas_vindas_concedidas),coupons:(coupons.data||[]).map(c=>({code:c.codigo,value:Number(c.valor)||0,used:Boolean(c.usado),createdAt:c.created_at,usedAt:c.used_at})),history:local.history||[]}:null;
  if(remote){
    // Nunca perde um saldo/cupom local em caso de uma sincronização anterior interrompida.
    const merged={...local,...remote,points:Math.max(Number(local.points)||0,Number(remote.points)||0)};
    if(!club.data) return local;
    localStorage.setItem(loyaltyStorageKey(),JSON.stringify(merged));
    return merged;
  }
  return local;
}
function loyaltyTier(points){if(points>=5000)return {name:"Luxe",min:5000,next:null};if(points>=2000)return {name:"Gold",min:2000,next:5000};return {name:"Essencial",min:0,next:2000};}
function loyaltyCouponCode(){return `RELPPS-${Math.random().toString(36).slice(2,7).toUpperCase()}-${Date.now().toString().slice(-4)}`;}
function grantWelcomePoints(){if(!currentUser)return;const data=getLoyalty();if(!data.welcomeGranted){data.points=(Number(data.points)||0)+20;data.welcomeGranted=true;data.history=[...(data.history||[]),{type:"welcome",points:20,date:new Date().toISOString()}];saveLoyalty(data);}}
function grantPurchasePoints(order){
  if(!currentUser||!order)return 0; const data=getLoyalty(); const orderId=String(order.id||order.orderId||"");
  if((data.history||[]).some(h=>h.type==="purchase"&&String(h.orderId)===orderId))return 0;
  const amount=Number(order?.totals?.subtotal||order?.totals?.total||0); const earned=Math.floor(amount/10);
  if(earned<=0)return 0; data.points=(Number(data.points)||0)+earned; data.history=[...(data.history||[]),{type:"purchase",orderId,points:earned,amount,date:new Date().toISOString()}]; saveLoyalty(data); return earned;
}
function renderLoyaltyDashboard(){
  const box=$("#clubAccountDashboard");if(!box)return;
  const data=getLoyalty(),points=Number(data.points)||0,tier=loyaltyTier(points);
  $("#clubPointsBalance").textContent=`${points.toLocaleString("pt-BR")} ✦`;
  $("#clubTierBadge").textContent=tier.name;
  const progress=tier.next?Math.max(0,Math.min(100,((points-tier.min)/(tier.next-tier.min))*100)):100;
  $("#clubProgressBar").style.width=`${progress}%`;
  $("#clubPointsProgressText").textContent=tier.next?`${Math.max(0,tier.next-points).toLocaleString("pt-BR")} pontos para o próximo nível.`:"Você alcançou o nível máximo Luxe.";
  $("#clubNextTierText").textContent=tier.next?`${tier.name} → ${tier.next===5000?"Luxe":"Gold"} com ${tier.next.toLocaleString("pt-BR")} pontos.`:"Benefícios máximos desbloqueados.";
  $$(".club-reward-card").forEach(btn=>{const cost=Number(btn.dataset.rewardPoints)||0;btn.disabled=points<cost;btn.title=points<cost?`Faltam ${cost-points} pontos`:"Resgatar recompensa";});
  const list=$("#clubCouponList"),empty=$("#clubCouponEmpty");
  const coupons=(data.coupons||[]).filter(c=>!c.used);
  if(list)list.innerHTML=coupons.map(c=>`<span class="club-coupon-chip" title="Cupom de uso exclusivo">${escapeHtml(c.code)} · R$ ${Number(c.value).toLocaleString("pt-BR",{minimumFractionDigits:2})} OFF</span>`).join("");
  if(empty)empty.textContent=coupons.length?`${coupons.length} cupom(ns) disponível(is) para sua próxima compra.`:"Nenhum cupom resgatado ainda.";
}
function redeemLoyaltyReward(cost,value){if(!currentUser){toast("Entre na sua conta para resgatar benefícios do Club Relpps.");openAccount();return;}const data=getLoyalty();if((Number(data.points)||0)<cost){toast(`Você precisa de ${cost} pontos para esta recompensa.`);return;}data.points-=cost;const coupon={code:loyaltyCouponCode(),value:Number(value),used:false,createdAt:new Date().toISOString()};data.coupons=[coupon,...(data.coupons||[])];data.history=[...(data.history||[]),{type:"redeem",points:-cost,value:Number(value),code:coupon.code,date:new Date().toISOString()}];saveLoyalty(data);renderLoyaltyDashboard();renderMinhaRelppsPage();toast(`Cupom ${coupon.code} criado com sucesso!`);}
function updateAccountButton(){
  const btn=$("#accountBtn"); if(!btn)return;
  const logged=Boolean(currentUser);
  const rawName=logged ? (currentProfile?.name || currentUser?.email || "") : "";
  const firstName=rawName ? String(rawName).trim().split(/\s+/)[0] : "";
  const name=logged ? `Olá, ${firstName || "você"}` : "Olá! Faça login";
  const sub=logged ? "Club Relpps" : "Ou cadastre-se";
  btn.querySelector("b").textContent=name;
  btn.querySelector("small").textContent=sub;
}

async function fillCheckoutFromAccount(){
  const f=$("#checkoutForm"); if(!f)return;
  if(!checkoutUseSavedData){["name","cpf","email","phone","cep","address","number","complement","district","city"].forEach(k=>{if(f.elements[k]){f.elements[k].value="";f.elements[k].readOnly=false;}});return;}
  const a=await loadProfile(); if(!a)return;
  ["name","cpf","email","phone","cep","address","number","complement","district","city"].forEach(k=>{
    if(!f.elements[k])return;
    const value=k==="email"?(a.email||currentUser?.email||""):(a[k]||"");
    f.elements[k].value=value;
    f.elements[k].readOnly=false;
  });
}
function setCheckoutAddressFields(form,a){
  ["cep","address","number","complement","district","city"].forEach(k=>{
    if(form.elements[k]){ form.elements[k].value=a[k] || ""; form.elements[k].readOnly=true; }
  });
}

function clearCheckoutAddressFields(form, clearValues=true){
  ["cep","address","number","complement","district","city"].forEach(k=>{
    if(form.elements[k]){
      if(clearValues) form.elements[k].value="";
      form.elements[k].readOnly=false;
    }
  });
}

function updateAddressChoiceUI(){
  const f=$("#checkoutForm"); if(!f)return;
  const choice=f.querySelector('input[name="addressChoice"]:checked')?.value || "new";
  const fields=$("#addressFields");
  const savedOption=$("#savedAddressOption");
  const savedRadio=f.querySelector('input[name="addressChoice"][value="saved"]');
  const hasSavedAddress=Boolean(currentProfile?.cep || currentProfile?.address || currentProfile?.number || currentProfile?.district || currentProfile?.city);

  if(savedOption){
    savedOption.classList.remove("hidden");
    savedOption.classList.toggle("disabled", !hasSavedAddress);
  }
  if(savedRadio) savedRadio.disabled=!hasSavedAddress;

  if(fields) fields.classList.toggle("address-saved",choice==="saved");
  if(choice==="saved" && hasSavedAddress){
    setCheckoutAddressFields(f,currentProfile);
  }else if(choice==="new"){
    // Não limpa os campos aqui. Isso evita apagar um novo endereço digitado
    // quando o checkout é atualizado/re-renderizado.
    clearCheckoutAddressFields(f, false);
  }else if(!hasSavedAddress){
    const newRadio=f.querySelector('input[name="addressChoice"][value="new"]');
    if(newRadio) newRadio.checked=true;
    clearCheckoutAddressFields(f, false);
  }
}


async function persistProfile(data){
  if(!supabaseClient || !currentUser)return false;

  const profileRow={
    id:currentUser.id,
    email:currentUser.email || data.email || "",
    nome_completo:data.name || "",
    cpf:data.cpf || "",
    whatsapp:data.phone || ""
  };

  const { data:saved, error:profileError } = await supabaseClient
    .from("perfis")
    .upsert(profileRow, { onConflict:"id" })
    .select("id,nome_completo,cpf,whatsapp,email")
    .single();

  if(profileError){
    console.error("Erro ao salvar perfil:", profileError);
    accountMessage("Não foi possível salvar seu cadastro: " + (profileError.message || "erro no banco"), "register");
    return false;
  }

  const cityText=String(data.city || "");
  const cityParts=cityText.split("/");
  const addressRow={
    user_id:currentUser.id,
    cep:String(data.cep || "").trim(),
    endereco:String(data.address || "").trim(),
    numero:String(data.number || "").trim(),
    complemento:String(data.complement || "").trim(),
    bairro:String(data.district || "").trim(),
    cidade:String(cityParts[0] || "").trim(),
    uf:String(cityParts[1] || "").trim()
  };

  // Não cria endereço vazio. Assim o checkout só oferece
  // "Usar endereço salvo" quando existe um endereço de verdade.
  const hasAddress=Object.values(addressRow).some((v,i)=>i>0 && String(v).trim());
  if(hasAddress){
    let addressSaved=null;
    let lastAddressError=null;
    for(const table of ["enderecos","endereços"]){
      const { data:existingAddress, error:findError } = await supabaseClient
        .from(table)
        .select("id")
        .eq("user_id", currentUser.id)
        .order("id", { ascending:false })
        .limit(1)
        .maybeSingle();

      if(findError){ lastAddressError=findError; continue; }

      if(existingAddress?.id){
        addressSaved=await supabaseClient
          .from(table)
          .update(addressRow)
          .eq("id", existingAddress.id)
          .select("id,user_id,cep,endereco,numero,complemento,bairro,cidade,uf")
          .single();
      }else{
        addressSaved=await supabaseClient
          .from(table)
          .insert(addressRow)
          .select("id,user_id,cep,endereco,numero,complemento,bairro,cidade,uf")
          .single();
      }

      if(!addressSaved.error) break;
      lastAddressError=addressSaved.error;
      addressSaved=null;
    }

    if(!addressSaved || addressSaved.error){
      const msg=lastAddressError?.message || "erro ao salvar endereço";
      console.error("Erro ao salvar endereço:", lastAddressError);
      accountMessage("Cadastro salvo, mas não foi possível salvar o endereço: " + msg, "register");
    }
  }

  currentProfile={
    id:saved.id, email:saved.email || currentUser.email || "",
    name:saved.nome_completo || "", cpf:saved.cpf || "", phone:saved.whatsapp || "",
    cep:addressRow.cep, address:addressRow.endereco, number:addressRow.numero,
    complement:addressRow.complemento, district:addressRow.bairro,
    city:addressRow.cidade, uf:addressRow.uf
  };
  updateAccountButton();
  return true;
}

function saveCheckoutProfile(form){
  // Dados digitados no checkout não alteram o cadastro.
  // O endereço só é salvo quando a conta é criada ou atualizado pelo cadastro.
  return;
}

function accountAddressText(a){
  if(!a)return "Nenhum endereço salvo.";
  const line1=[a.address,a.number].filter(Boolean).join(", ");
  const line2=[a.complement,a.district].filter(Boolean).join(" • ");
  return [line1,line2,a.city,a.cep?`CEP ${a.cep}`:""].filter(Boolean).join("<br>");
}

function renderMinhaRelppsPage(){
  if(!currentUser)return;
  const data=getLoyalty(), points=Number(data.points)||0, tier=loyaltyTier(points);
  const name=(currentProfile?.name||currentUser?.user_metadata?.name||"Cliente").trim().split(/\s+/)[0]||"Cliente";
  const progress=tier.next?Math.max(0,Math.min(100,((points-tier.min)/(tier.next-tier.min))*100)):100;
  $("#minhaRelppsName") && ($("#minhaRelppsName").textContent=name);
  $("#minhaRelppsTier") && ($("#minhaRelppsTier").textContent=tier.name);
  $("#minhaRelppsPoints") && ($("#minhaRelppsPoints").textContent=`${points.toLocaleString("pt-BR")} ✦`);
  $("#minhaRelppsProgress") && ($("#minhaRelppsProgress").textContent=tier.next?`${Math.max(0,tier.next-points).toLocaleString("pt-BR")} pontos para o próximo nível.`:"Você alcançou o nível máximo do Club Relpps.");
  $("#minhaRelppsProgressBar") && ($("#minhaRelppsProgressBar").style.width=`${progress}%`);
  $("#minhaRelppsNextTier") && ($("#minhaRelppsNextTier").textContent=tier.next?`${tier.name} → ${tier.next===5000?"Luxe":"Gold"} com ${tier.next.toLocaleString("pt-BR")} pontos.`:"Benefícios Luxe desbloqueados.");
  $("#minhaRelppsEmail") && ($("#minhaRelppsEmail").textContent=currentProfile?.email||currentUser?.email||"");
  $("#minhaRelppsAddress") && ($("#minhaRelppsAddress").innerHTML=accountAddressText(currentProfile));
  const rewards=$("#minhaRelppsRewards");
  if(rewards){rewards.innerHTML=[
    [800,10,"Meta Essencial"],[2000,30,"Meta Gold"],[5000,90,"Meta Luxe"],[9000,180,"Benefício Signature"]
  ].map(([cost,value,label])=>`<button type="button" class="club-reward-card minha-reward-card" data-reward-points="${cost}" data-reward-value="${value}" ${points<cost?"disabled":""}><b>${cost.toLocaleString("pt-BR")} ✦</b><span>R$ ${value} OFF</span><small>${label}</small></button>`).join("");}
  const coupons=(data.coupons||[]).filter(c=>!c.used), list=$("#minhaRelppsCouponList"), empty=$("#minhaRelppsCouponEmpty");
  if(list) list.innerHTML=coupons.length?coupons.map(c=>`<article class="minha-relpps-coupon-card"><span>CLUB RELPPS</span><b>${escapeHtml(c.code)}</b><strong>R$ ${Number(c.value).toLocaleString("pt-BR",{minimumFractionDigits:2})} OFF</strong><small>Disponível para usar no pagamento</small></article>`).join(""):"";
  if(empty) empty.textContent=coupons.length?`${coupons.length} cupom(ns) disponível(is) para sua próxima compra.`:"Quando você conquistar ou resgatar um benefício, ele aparecerá aqui.";
}
async function openMinhaRelppsPage(){
  if(!currentUser){ $("#accountModal").classList.remove("hidden"); document.body.style.overflow="hidden"; return; }
  const page=$("#minhaRelppsPage");
  if(page?.classList.contains("hidden")) minhaRelppsOrigin={scrollY:window.scrollY||0,hash:location.hash||""};
  if(cloudReady()) await loadProfile();
  renderLoyaltyDashboard(); renderMinhaRelppsPage();
  if(page){
    page.classList.remove("hidden","is-leaving");
    page.classList.add("is-entering");
    page.setAttribute("aria-hidden","false");
    requestAnimationFrame(()=>page.scrollTo?.({top:0,behavior:"auto"}));
    setTimeout(()=>page.classList.remove("is-entering"),520);
  }
  document.body.style.overflow="hidden";
}
function closeMinhaRelppsPage(){
  const page=$("#minhaRelppsPage");
  if(!page || page.classList.contains("hidden")){document.body.style.overflow="";return Promise.resolve();}
  page.classList.remove("is-entering");
  page.classList.add("is-leaving");
  page.setAttribute("aria-hidden","true");
  return new Promise(resolve=>setTimeout(()=>{
    page.classList.remove("is-leaving");
    page.classList.add("hidden");
    document.body.style.overflow="";
    requestAnimationFrame(()=>window.scrollTo({top:minhaRelppsOrigin.scrollY||0,behavior:"auto"}));
    resolve();
  },380));
}
function showWelcomeRelpps(){return new Promise(resolve=>{const o=$("#welcomeRelppsOverlay"); if(!o){resolve();return;}o.classList.remove("hidden");setTimeout(()=>{o.classList.add("hidden");resolve();},2200);});}

async function openAccountForCheckout(){
  pendingCheckout=true;
  await openAccount();
  if(!currentUser) switchAccountTab("login");
}

async function openAccount(){
  if(currentUser){ await openMinhaRelppsPage(); return; }
  $("#accountModal").classList.remove("hidden");
  document.body.style.overflow="hidden";
  if(cloudReady()) await loadProfile();
  const logged=Boolean(currentUser);
  $("#accountSaved").classList.toggle("hidden",!logged);
  $("#loginForm").classList.toggle("hidden",logged);
  $("#registerForm").classList.add("hidden");
  $$(".account-tab").forEach(t=>t.classList.toggle("active",t.dataset.accountTab==="login"));
  if(logged){
    $("#savedName").textContent=currentProfile?.name||"Cliente";
    $("#savedEmail").textContent=currentProfile?.email||currentUser?.email||"";
    $("#savedAddress").innerHTML=accountAddressText(currentProfile);
    renderLoyaltyDashboard();
  }else if(!cloudReady()){
    accountMessage("O cadastro online está pronto no projeto, mas falta colocar as credenciais do Supabase em config.js.", "login");
  }
}

function switchAccountTab(tab){
  if(currentUser)return;
  $("#loginForm").classList.toggle("hidden",tab!=="login");
  $("#registerForm").classList.toggle("hidden",tab!=="register");
  $$(".account-tab").forEach(t=>t.classList.toggle("active",t.dataset.accountTab===tab));
  $("#accountTitle").textContent=tab==="register"?"Crie sua conta":"Minha conta";
  accountMessage("", "login"); accountMessage("", "register");
}

async function lookupAccountCep(){
  const cep=$("#accountCep").value.replace(/\D/g,""); if(cep.length!==8)return;
  try{
    const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`); const d=await r.json(); if(d.erro)throw 0;
    $("#accountAddress").value=d.logradouro||"";
    $("#accountDistrict").value=d.bairro||"";
    $("#accountCity").value=`${d.localidade||""} / ${d.uf||""}`;
  }catch{$("#registerStatus").textContent="Não foi possível consultar o CEP.";}
}

async function handleRegister(e){
  e.preventDefault();
  if(!requireCloud())return;
  const data=Object.fromEntries(new FormData(e.target).entries());
  if(data.password!==data.passwordConfirm){$("#registerStatus").textContent="As senhas não conferem.";return;}
  if(String(data.password||"").length<6){$("#registerStatus").textContent="A senha precisa ter pelo menos 6 caracteres.";return;}

  $("#registerStatus").textContent="Criando sua conta...";
  const { data:authData, error } = await supabaseClient.auth.signUp({
    email:data.email.toLowerCase().trim(),
    password:data.password,
    options:{
      data:{
        name:data.name, cpf:data.cpf, phone:data.phone, cep:data.cep,
        address:data.address, number:data.number, complement:data.complement,
        district:data.district, city:data.city
      },
      emailRedirectTo:window.location.href.split("#")[0]
    }
  });
  if(error){$("#registerStatus").textContent=error.message||"Não foi possível criar a conta.";return;}

  if(authData.session){
    currentUser=authData.user;
    await persistProfile(data);
    await loadProfile();
    grantWelcomePoints();
    $("#registerStatus").textContent="Conta criada e dados salvos na nuvem. Você ganhou 20 pontos de boas-vindas no Club Relpps.";
    if(pendingCheckout){
      pendingCheckout=false;
      closeModal("accountModal");
      await openCheckout();
      toast("Conta criada. Agora você pode finalizar a compra.");
    }else{
      closeModal("accountModal");
      await showWelcomeRelpps();
      toast("Conta criada com sucesso. Bem-vinda ao Club Relpps!");
    }
  }else{
    $("#registerStatus").textContent="Cadastro criado. Verifique seu e-mail para confirmar a conta e depois faça login para continuar a compra.";
  }
}

async function handleLogin(e){
  e.preventDefault();
  if(!requireCloud())return;
  const data=Object.fromEntries(new FormData(e.target).entries());
  $("#loginStatus").textContent="Entrando...";
  const { data:authData, error } = await supabaseClient.auth.signInWithPassword({
    email:data.email.toLowerCase().trim(), password:data.password
  });
  if(error){$("#loginStatus").textContent="E-mail ou senha não conferem.";return;}
  currentUser=authData.user;
  // Recupera os dados informados no cadastro e garante que o endereço fique salvo.
  // Se o cliente já tiver endereço salvo no banco, não o substituímos por campos vazios.
  await loadProfile();
  const meta=currentUser.user_metadata||{};
  const saved=currentProfile||{};
  await persistProfile({
    name:meta.name||saved.name||"", cpf:meta.cpf||saved.cpf||"", phone:meta.phone||saved.phone||"", email:currentUser.email||meta.email||saved.email||"",
    // Se o banco já tem endereço, ele é preservado. Se o cadastro guardou
    // endereço no Auth, ele é recuperado e salvo na tabela na primeira entrada.
    cep:meta.cep||saved.cep||"", address:meta.address||saved.address||"", number:meta.number||saved.number||"", complement:meta.complement||saved.complement||"",
    district:meta.district||saved.district||"", city:meta.city || [saved.city,saved.uf].filter(Boolean).join(" / ")
  });
  await loadProfile();
  if(pendingCheckout){
    pendingCheckout=false;
    closeModal("accountModal");
    await openCheckout();
    toast("Login realizado. Agora você pode finalizar a compra.");
  }else{
    closeModal("accountModal");
    toast("Login realizado com sucesso.");
  }
}

async function logoutAccount(){
  if(supabaseClient) await supabaseClient.auth.signOut();
  currentUser=null; currentProfile=null; checkoutCoupon=null; updateAccountButton();
  await closeMinhaRelppsPage();
  $("#accountSaved").classList.add("hidden");
  $("#loginForm").classList.remove("hidden");
  $("#registerForm").classList.add("hidden");
  toast("Você saiu da conta.");
}

async function initCloudAuth(){
  if(!cloudReady()) { updateAccountButton(); return; }
  const { data:{ session } } = await supabaseClient.auth.getSession();
  currentUser=session?.user||null;
  if(currentUser) { await loadProfile(); await loadLoyaltyFromCloud(); grantWelcomePoints(); renderLoyaltyDashboard(); } else updateAccountButton();
  supabaseClient.auth.onAuthStateChange((_event, session)=>{
    currentUser=session?.user||null;
    setTimeout(async()=>{
      await loadProfile();
      if(currentUser){ await loadLoyaltyFromCloud(); grantWelcomePoints(); renderLoyaltyDashboard(); }
    },0);
  });
}

function isGlue(item){const kws=window.RELPPS_CONFIG?.GLUE_KEYWORDS||["cola"];const t=slug(`${item.name} ${item.category}`);return kws.some(k=>t.includes(slug(k)))}
function totals(payment="pix"){
  const subtotal=cart.reduce((s,i)=>s+i.price*i.qty,0);
  let automaticDiscount=0;
  const discountItems=[];
  const discountPayment = payment === "pix" || payment === "cash";
  const eligible=discountPayment && subtotal >= Number(window.RELPPS_CONFIG?.DISCOUNT_MIN_SUBTOTAL||100);
  if(eligible){
    cart.forEach(i=>{
      // Regra Relpps: 5% em todos os produtos e 3% nas colas, somente a partir de R$ 100 no Pix ou dinheiro.
      const rate=isGlue(i)?Number(window.RELPPS_CONFIG?.GLUE_DISCOUNT||.03):Number(window.RELPPS_CONFIG?.GENERAL_DISCOUNT||.05);
      const amount=i.price*i.qty*rate;
      automaticDiscount += amount;
      if(amount>0) discountItems.push({productId:i.id,name:i.name,quantity:i.qty,rate,amount,rule:isGlue(i)?"COLA_3_PERCENT":"GERAL_5_PERCENT"});
    });
  }
  return {subtotal,automaticDiscount,automaticDiscountItems:discountItems,discount:automaticDiscount,total:subtotal-automaticDiscount,discountEligible:eligible};
}
function renderCartRelated(){
  const wrap=$("#cartRelatedWrap"), box=$("#cartRelated"); if(!wrap||!box)return;
  if(!cart.length){wrap.classList.add("hidden"); box.innerHTML=""; return;}
  const cartIds=new Set(cart.map(i=>String(i.groupId||i.id)));
  const preferredAreas=[...new Set(cart.map(i=>slug(i.category||i.area||"")))];
  const preferredBrands=[...new Set(cart.map(i=>slug(products.find(p=>String(p.id)===String(i.groupId||i.id))?.brand||"")))];
  const candidates=products.filter(p=>!cartIds.has(String(p.id))&&Number(p.stock)>0)
    .map(p=>({p,score:(preferredAreas.includes(slug(p.category||p.area||""))?4:0)+(preferredBrands.includes(slug(p.brand||""))?2:0)+(p.variationItems?.length?1:0)}))
    .sort((a,b)=>b.score-a.score || Number(b.p.stock)-Number(a.p.stock))
    .slice(0,6).map(x=>x.p);
  if(!candidates.length){wrap.classList.add("hidden"); return;}
  wrap.classList.remove("hidden");
  box.innerHTML=candidates.map(p=>`<article class="cart-related-item"><button class="cart-related-image" type="button" data-related-view="${p.id}" aria-label="Ver ${p.name}"><img src="${p.image}" alt="${p.name}"></button><div><button class="cart-related-name" type="button" data-related-view="${p.id}">${p.name}</button><span>${money(p.price)}</span><button class="cart-related-add" type="button" data-related-add="${p.id}">Adicionar</button></div></article>`).join("");
  setupRelatedCarousel();
}
let relatedCarouselTimer=null;
function setupRelatedCarousel(){
  const box=$("#cartRelated"); if(!box) return;
  if(relatedCarouselTimer) clearInterval(relatedCarouselTimer);
  const step=()=>Math.max(180,Math.min(260,box.clientWidth*.68));
  const move=dir=>{const max=box.scrollWidth-box.clientWidth; const next=box.scrollLeft+dir*step(); if(dir>0&&next>=max-4) box.scrollTo({left:0,behavior:"smooth"}); else if(dir<0&&box.scrollLeft<=4) box.scrollTo({left:max,behavior:"smooth"}); else box.scrollBy({left:dir*step(),behavior:"smooth"});};
  const prev=$("#cartRelatedPrev"), nextBtn=$("#cartRelatedNext"); if(prev) prev.onclick=()=>move(-1); if(nextBtn) nextBtn.onclick=()=>move(1);
  relatedCarouselTimer=setInterval(()=>{if(!document.hidden&&$("#cartDrawer")?.classList.contains("open"))move(1)},4200);
  ["mouseenter","touchstart"].forEach(ev=>box.addEventListener(ev,()=>{if(relatedCarouselTimer){clearInterval(relatedCarouselTimer);relatedCarouselTimer=null;}},{once:true}));
}
function continueShopping(){ closeCart(); location.hash="produtos"; setTimeout(()=>document.querySelector("#produtos")?.scrollIntoView({behavior:"smooth",block:"start"}),50); }
function renderCart(){
  $("#cartCount").textContent=cart.reduce((s,i)=>s+i.qty,0);
  $("#floatingCount").textContent=cart.reduce((s,i)=>s+i.qty,0);
  const list=$("#cartItems");
  if(!cart.length){list.innerHTML='<div class="empty-cart">Seu carrinho está vazio.<br><br>Escolha seus produtos favoritos.</div>';}
  else list.innerHTML=cart.map(i=>`
    <div class="cart-item">
      <img src="${i.image}" alt="${i.name}">
      <div><h4>${i.name}</h4><small>${Object.entries(i.variations||{}).map(([a,b])=>`${a}: ${b}`).join(" • ")||"Padrão"}</small>
        <div class="qty"><button data-qty="${i.key}" data-change="-1">−</button><span>${i.qty}</span><button data-qty="${i.key}" data-change="1">+</button></div>
      </div><strong>${money(i.price*i.qty)}</strong>
    </div>`).join("");
  renderCartRelated();
  const t=totals("card");$("#cartSubtotal").textContent=money(t.subtotal);$("#cartTotal").textContent=money(t.subtotal);
}
function openCart(){renderCart();$("#cartDrawer").classList.add("open");$("#drawerBackdrop").classList.remove("hidden")}
function closeCart(){$("#cartDrawer").classList.remove("open");$("#drawerBackdrop").classList.add("hidden")}

function renderCartPage(){
  const page=$("#cartPage"); if(!page)return;
  const items=$("#cartPageItems"); const count=cart.reduce((s,i)=>s+i.qty,0);
  $("#cartPageCountLabel").textContent=`${count} ${count===1?"item":"itens"}`;
  if(!cart.length){items.innerHTML='<div class="empty-cart">Seu carrinho está vazio.<br><br>Escolha seus produtos favoritos.</div>';}
  else items.innerHTML=cart.map(i=>`<article class="cart-page-item"><img src="${i.image}" alt="${i.name}"><div><h3>${i.name}</h3><small>${Object.entries(i.variations||{}).map(([a,b])=>`${a}: ${b}`).join(" • ")||"Produto selecionado"}</small><div class="qty"><button data-cart-page-qty="${i.key}" data-change="-1">−</button><span>${i.qty}</span><button data-cart-page-qty="${i.key}" data-change="1">+</button></div></div><strong>${money(i.price*i.qty)}</strong></article>`).join("");
  updateCartPageTotals();
}
function updateCartPageTotals(){
  const base=totals("card");
  const pickupMode=cartPageReceiveMode==="pickup";
  const shipping=pickupMode?0:getShippingValue();
  $("#cartPageSubtotal") && ($("#cartPageSubtotal").textContent=money(base.subtotal));
  $("#cartPageShipping") && ($("#cartPageShipping").textContent=pickupMode?"Grátis":(selectedShipping?money(shipping):"—"));
  $("#cartPageTotal") && ($("#cartPageTotal").textContent=money(base.total+shipping));
}
function openCartPage(){
  if(!cart.length){toast("Adicione pelo menos um produto.");return;}
  closeCart(); renderCartPage();
  const page=$("#cartPage"); page.classList.remove("hidden"); page.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
  const cep=$("#cartPageCep"); if(cep && !cep.value && $("#cep")?.value) cep.value=$("#cep").value;
  const modeRadio=$(`input[name="cartPageReceiveMode"][value="${cartPageReceiveMode}"]`); if(modeRadio) modeRadio.checked=true;
  updateCartPageReceiveUI();
}
function closeCartPage(){const page=$("#cartPage"); if(!page)return; page.classList.add("hidden"); page.setAttribute("aria-hidden","true"); document.body.style.overflow="";}
function updateCartPageReceiveUI(){
  const pickup=cartPageReceiveMode==="pickup";
  const cepWrap=$("#cartPageCep")?.closest(".cart-page-cep");
  const helper=document.querySelector(".cart-page-helper");
  const shippingBox=$("#cartPageShippingOptions");
  if(cepWrap) cepWrap.classList.toggle("hidden",pickup);
  if(helper) helper.textContent=pickup?"Você escolheu retirada. No checkout, escolha retirada presencial ou via Uber por conta do cliente.":"Digite seu CEP para ver somente as duas opções disponíveis.";
  if(shippingBox){
    if(pickup){ shippingBox.innerHTML='<div class="cart-page-shipping-empty pickup-mode"><b>🏪 Retirada selecionada</b><br>Sem frete nesta etapa. Você escolherá o tipo de retirada no checkout.</div>'; }
    else renderCartPageShipping();
  }
  updateCartPageTotals();
}
function renderCartPageShipping(){
  const box=$("#cartPageShippingOptions"); if(!box)return;
  if(cartPageReceiveMode==="pickup"){ updateCartPageTotals(); return; }
  const hasUber=shippingQuotes.uber; const correios=shippingQuotes.melhor_envio?.[0];
  if(!hasUber&&!correios){box.innerHTML='<div class="cart-page-shipping-empty">Informe seu CEP para calcular Uber Entregas e Correios.</div>';updateCartPageTotals();return;}
  const opts=[];
  if(hasUber)opts.push({provider:"uber",icon:"🛵",title:"Uber Entregas",sub:"Entrega rápida na região disponível",q:hasUber});
  if(correios)opts.push({provider:"melhor_envio",icon:"📦",title:"Correios",sub:`${correios.name||"PAC"}${correios.delivery_time?` • até ${correios.delivery_time} dias úteis`:""}`,q:correios});
  box.innerHTML=opts.map((o,i)=>{const checked=selectedShipping&&selectedShipping.provider===o.provider&&String(selectedShipping.id||selectedShipping.service)===String(o.q.id||o.q.service)?"checked":(!selectedShipping&&i===0?"checked":"");return `<label class="cart-page-shipping-option"><input type="radio" name="cartPageShippingService" data-provider="${o.provider}" data-index="${i}" ${checked}><span class="shipping-provider-mark">${o.icon}</span><span><b>${o.title}</b><small>${o.sub}</small></span><strong>${money(o.q.price)}</strong></label>`}).join("");
  box.querySelectorAll('input[name="cartPageShippingService"]').forEach(r=>r.addEventListener("change",()=>{
    const o=opts[Number(r.dataset.index)]; selectedShipping={provider:o.provider,...o.q,label:o.title}; updateCartPageTotals();
  }));
  if(!selectedShipping&&opts[0])selectedShipping={provider:opts[0].provider,...opts[0].q,label:opts[0].title};
  updateCartPageTotals();
}
async function quoteCartPageShipping(){
  if(cartPageReceiveMode==="pickup"){ updateCartPageReceiveUI(); return; }
  const input=$("#cartPageCep"); const cep=(input?.value||"").replace(/\D/g,"");
  if(cep.length!==8){toast("Informe um CEP válido para calcular o frete.");return;}
  input.value=formatCep(cep); const btn=$("#cartPageQuoteButton"); const old=btn.textContent; btn.disabled=true;btn.textContent="Calculando…";
  try{
    const data=buildLocalTestShippingQuotes(cep,cartForShipping());
    shippingQuotes={melhor_envio:data.melhor_envio||[],uber:data.uber||null};
    selectedShipping=null; renderCartPageShipping(); toast("Frete calculado com sucesso.");
  }catch(e){toast("Não foi possível calcular o frete agora.");}
  finally{btn.disabled=false;btn.textContent=old;}
}

function getAppliedCoupon(){return checkoutCoupon && !checkoutCoupon.used ? checkoutCoupon : null;}
function applyCheckoutCoupon(){
  const input=$("#checkoutCouponCode"), status=$("#checkoutCouponStatus"); const code=String(input?.value||"").trim().toUpperCase();
  if(!code){checkoutCoupon=null;if(status)status.textContent="Nenhum cupom aplicado.";updateCheckoutTotals();return;}
  if(!currentUser){toast("Entre na sua conta para usar um cupom do Club Relpps.");return;}
  const coupon=(getLoyalty().coupons||[]).find(c=>String(c.code).toUpperCase()===code&&!c.used);
  if(!coupon){checkoutCoupon=null;if(status)status.textContent="Código não encontrado ou já utilizado.";toast("Cupom inválido.");updateCheckoutTotals();return;}
  checkoutCoupon={...coupon}; if(status)status.textContent=`Cupom aplicado: R$ ${Number(coupon.value).toLocaleString("pt-BR",{minimumFractionDigits:2})} OFF ✓`;toast("Cupom do Club Relpps aplicado!");updateCheckoutTotals();
}
function couponAdjustedTotals(base){
  const c=getAppliedCoupon();
  const couponDiscount=c?Math.min(Number(c.value)||0,Math.max(0,base.subtotal-(base.automaticDiscount||base.discount||0))):0;
  const automaticDiscount=Number(base.automaticDiscount??base.discount)||0;
  return {...base,automaticDiscount,couponDiscount,couponCode:c?.code||null,discount:automaticDiscount+couponDiscount,total:Math.max(0,base.subtotal-automaticDiscount-couponDiscount)};
}
function markAppliedCouponUsed(){const c=getAppliedCoupon();if(!c||!currentUser)return;const data=getLoyalty();const target=(data.coupons||[]).find(x=>x.code===c.code&&!x.used);if(target){target.used=true;target.usedAt=new Date().toISOString();saveLoyalty(data);}checkoutCoupon=null;}

async function renderCheckout(){
  await fillCheckoutFromAccount();
  const payment=checkoutPayment || $("input[name=payment]:checked")?.value || null;
  const t=couponAdjustedTotals(totals(payment === "pix_online" ? "pix" : (payment || "card")));
  $("#checkoutSummaryItems").innerHTML=cart.map(i=>`<div class="summary-item"><span>${i.qty}× ${i.name}</span><b>${money(i.price*i.qty)}</b></div>`).join("");
  if($("#checkoutSubtotal")) $("#checkoutSubtotal").textContent=money(t.subtotal);
  const discountLine=$("#checkoutDiscountLine");
  if($("#checkoutDiscount")) $("#checkoutDiscount").textContent=`− ${money(t.discount||0)}`;
  if(discountLine) discountLine.classList.toggle("hidden", !(t.discount>0));
  updateDeliveryUI();
  if(typeof setCheckoutStage === "function") setCheckoutStage(1,false);
}
function getShippingValue(){ return Number(selectedShipping?.price||0); }
function selectedShippingLabel(){ return selectedShipping?.label || "Calcule o frete"; }
function updateCheckoutTotals(){
  const payment=checkoutPayment || $("input[name=payment]:checked")?.value || null;
  const base=couponAdjustedTotals(totals(payment === "pix_online" ? "pix" : (payment || "card")));
  const total=base.total+getShippingValue();
  if($("#checkoutSubtotal")) $("#checkoutSubtotal").textContent=money(base.subtotal);
  const discountLine=$("#checkoutDiscountLine");
  if($("#checkoutDiscount")) $("#checkoutDiscount").textContent=`− ${money(base.discount||0)}`;
  if(discountLine) discountLine.classList.toggle("hidden", !(base.discount>0));
  $("#checkoutShipping").textContent=selectedShipping ? money(getShippingValue()) : (isPickupMethod(getSelectedDeliveryMethod())?"Grátis":"Calcule o CEP");
  $("#checkoutTotal").textContent=money(total);
  updateCartPageTotals();
  return {...base,shipping:getShippingValue(),total};
}
function getSelectedDeliveryMethod(){ return $('input[name="delivery"]:checked')?.value || "melhor_envio"; }
function isPickupMethod(method){ return method==="pickup" || method==="pickup_uber"; }
function updateDeliveryUI(){
  const method=getSelectedDeliveryMethod();
  const needsAddress=method!=="pickup";
  $("#addressFields")?.classList.toggle("hidden",!needsAddress);
  const fields=$("#checkoutForm");
  ["cep","address","number","district","city"].forEach(name=>{ if(fields?.elements[name]) fields.elements[name].required=needsAddress; });

  const storeCard=$("#storePickupCard");
  if(storeCard){
    storeCard.classList.toggle("hidden",!isPickupMethod(method));
    const note=$("#storePickupNote");
    if(note) note.textContent=method==="pickup_uber"
      ?"Aguarde a confirmação e a liberação do pedido antes de solicitar o Uber. A corrida é por conta do cliente."
      :"Não é necessário informar CEP ou endereço. Após o pagamento aprovado, o pedido será preparado para retirada.";
  }

  // Mantém a cotação já calculada ao alternar entre Uber e Correios.
  // Isso evita o bug de trocar de opção e deixar o checkout sem frete.
  if(method==="pickup" || method==="pickup_uber"){
    selectedShipping={
      provider:"pickup",
      service:method==="pickup_uber"?"Retirada via Uber por conta do cliente":"Retirada presencial",
      label:method==="pickup_uber"?"Retirada via Uber por conta do cliente":"Retirada presencial",
      price:0,delivery_time:null
    };
  }else if(method==="uber"){
    if(shippingQuotes.uber){
      selectedShipping={provider:"uber",...shippingQuotes.uber,label:shippingQuotes.uber.name||"Uber Entregas"};
    }else if(selectedShipping?.provider!=="uber"){
      selectedShipping=null;
    }
  }else if(method==="melhor_envio"){
    const q=shippingQuotes.melhor_envio?.[0];
    if(q){
      selectedShipping={provider:"melhor_envio",...q,label:q.name||"Correios"};
    }else if(selectedShipping?.provider!=="melhor_envio"){
      selectedShipping=null;
    }
  }

  renderShippingQuotes();
  renderPaymentOptions(method);
  updateCheckoutTotals();
}
function renderPaymentOptions(method){
  const box=$("#paymentOptions"); if(!box)return;
  let current=checkoutPayment || $("input[name=payment]:checked")?.value || null;
  const opts=[
    ["pix_online","Pix","Pagamento online seguro."],
    ["card","Cartão","Pagamento online seguro via InfinitePay."]
  ];
  // Dinheiro é permitido somente para retirada presencial.
  if(method==="pickup") opts.push(["cash","Dinheiro","Pagamento em dinheiro no momento da retirada."]);
  // Nunca pré-seleciona pagamento. Se a opção anterior não existir no método atual, limpa a seleção.
  if(!opts.some(x=>x[0]===current)) { current=null; checkoutPayment=null; }

  box.innerHTML=opts.map(o=>`<label class="payment-option"><input type="radio" name="payment" value="${o[0]}" ${current===o[0]?"checked":""}><span><b>${o[1]}</b><small>${o[2]}</small></span></label>`).join("");
  box.querySelectorAll('input[name="payment"]').forEach(r=>r.addEventListener("change",()=>{ checkoutPayment=r.value; updateCheckoutTotals(); }));
  const note=$("#paymentNote");
  if(note) note.textContent=method==="pickup"
    ?(CHECKOUT_TEST_MODE?"Modo de teste ativo. Para retirada presencial, Pix, Cartão ou Dinheiro estão disponíveis.":"Para retirada presencial, escolha Pix, Cartão ou Dinheiro.")
    :(CHECKOUT_TEST_MODE?"Modo de teste ativo: nenhum pagamento real será cobrado.":"Seu pedido será liberado automaticamente após a confirmação do pagamento pela InfinitePay.");
}
function formatCep(v){ const d=String(v||"").replace(/\D/g,"").slice(0,8); return d.length>5?`${d.slice(0,5)}-${d.slice(5)}`:d; }
async function lookupCep(){
  const input=$("#cep"); const cep=input.value.replace(/\D/g,""); input.value=formatCep(input.value);
  if(cep.length!==8)return;
  try{
    const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`);const d=await r.json();if(d.erro)throw 0;
    $("#address").value=d.logradouro||"";$("#district").value=d.bairro||"";$("#city").value=`${d.localidade||""} / ${d.uf||""}`;
    quoteShipping();
  }catch{toast("Não foi possível consultar o CEP.");}
}
function cartForShipping(){ return cart.map(i=>({id:String(i.id),name:i.name,quantity:i.qty,price:Number(i.price)||0,width:11,height:17,length:11,weight:.3})); }
function buildLocalTestShippingQuotes(cep,items=cartForShipping()){
  const qty=(items||[]).reduce((n,i)=>n+Math.max(1,Number(i.quantity)||1),0);
  const seed=Number(String(cep||"").slice(-3)||0);
  const base=Math.max(12,Math.min(49,12+(seed%21)+qty*1.8));
  return {
    melhor_envio:[
      {id:"test-correios-pac",name:"Correios PAC",company:"Correios",price:Number(base.toFixed(2)),delivery_time:5+(seed%5)},
      {id:"test-correios-sedex",name:"Correios SEDEX",company:"Correios",price:Number((base+12.9).toFixed(2)),delivery_time:2+(seed%3)}
    ],
    uber:{id:"test-uber-moto",name:"Uber Moto",company:"Uber Direct",price:Number((Math.max(9,base*.78)).toFixed(2)),eta:"estimativa local"},
    testMode:true
  };
}
function applyShippingQuoteData(data){
  shippingQuotes={melhor_envio:Array.isArray(data?.melhor_envio)?data.melhor_envio:[],uber:data?.uber||null};
  const method=getSelectedDeliveryMethod();
  if(method==="melhor_envio" && shippingQuotes.melhor_envio.length){
    const q=shippingQuotes.melhor_envio[0];
    selectedShipping={provider:"melhor_envio",...q,label:q.name||q.service||"Correios"};
  } else if(method==="uber" && shippingQuotes.uber){
    selectedShipping={provider:"uber",...shippingQuotes.uber,label:shippingQuotes.uber.name||"Uber Entregas"};
  } else if(isPickupMethod(method)){
    selectedShipping={provider:"pickup",service:method==="pickup_uber"?"Retirada via Uber por conta do cliente":"Retirada presencial",label:method==="pickup_uber"?"Retirada via Uber por conta do cliente":"Retirada presencial",price:0};
  } else {
    selectedShipping=null;
  }
  renderShippingQuotes();
  updateCheckoutTotals();
}
async function quoteShipping(){
  const cepInput=$("#cep");
  const cep=cepInput?.value.replace(/\D/g,"");
  if(cep.length!==8){
    toast("Informe um CEP válido para calcular o frete.");
    return;
  }

  // Mantém o CEP formatado e evita depender de qualquer servidor no modo de teste.
  if(cepInput) cepInput.value=formatCep(cep);
  const panel=$("#shippingQuotePanel");
  const button=$("#quoteShippingButton");
  const oldButtonText=button?.textContent || "Calcular frete";
  if(panel) panel.innerHTML='<div class="shipping-loading">Calculando opções de entrega…</div>';
  if(button){button.disabled=true;button.textContent="Calculando…";}

  const items=cartForShipping();
  try{
    // Produção: a cotação é calculada no backend, mantendo as credenciais protegidas.
    // O modo de teste só deve ser ativado conscientemente no ambiente de homologação.
    const subtotal=cart.reduce((a,i)=>a+i.price*i.qty,0);
    const endpoints=["/api/shipping?action=quote","/.netlify/functions/shipping?action=quote"];
    let lastError=null;
    for(const endpoint of endpoints){
      try{
        const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cep,items,subtotal,address:$("#address")?.value||"",number:$("#number")?.value||"",complement:$("#complement")?.value||"",district:$("#district")?.value||"",city:$("#city")?.value||""})});
        const text=await r.text();
        let data={};
        try{data=text?JSON.parse(text):{};}catch{throw new Error("Resposta inválida do servidor de frete.");}
        if(!r.ok) throw new Error(data.message||"Falha ao calcular frete");
        applyShippingQuoteData(data);
        const note=$("#shippingStatusNote");
        if(note) note.textContent="Cotação atualizada com as transportadoras disponíveis.";
        return;
      }catch(err){ lastError=err; }
    }
    throw lastError || new Error("Não foi possível obter a cotação.");
  }catch(e){
    if(panel) panel.innerHTML='<div class="shipping-error">Não foi possível calcular o frete agora. Confira o CEP e tente novamente.</div>';
    const note=$("#shippingStatusNote");
    if(note) note.textContent="A cotação online não respondeu. Tente novamente em alguns instantes.";
  }finally{
    if(button){button.disabled=false;button.textContent=oldButtonText;}
  }
}
function renderShippingQuotes(){
  const panel=$("#shippingQuotePanel"); if(!panel)return;
  const method=getSelectedDeliveryMethod();
  if(isPickupMethod(method)){ const uberPickup=method==="pickup_uber"; panel.innerHTML=`<div class="shipping-pickup"><b>${uberPickup?"🛵 Retirada via Uber":"🏪 Retirada presencial"}</b><span>${uberPickup?"Aguarde a liberação do pedido. Depois da confirmação, solicite o Uber por sua conta para retirar.":"Sem frete. Após o pagamento aprovado, o pedido será preparado para retirada."}</span></div>`; return; }
  const options=method==="uber"?(shippingQuotes.uber?[shippingQuotes.uber]:[]):shippingQuotes.melhor_envio;
  if(!options?.length){ panel.innerHTML='<div class="shipping-empty"><b>Calcule o frete pelo CEP</b><span>As opções disponíveis aparecerão aqui.</span></div>'; return; }
  panel.innerHTML=`<div class="shipping-provider-title">${method==="uber"?"🛵 Uber Moto":"📦 Melhor Envio"}</div><div class="shipping-options">${options.map((q,i)=>{
    const provider=method; const key=`${provider}:${q.id||q.service||i}`; const checked=selectedShipping && selectedShipping.provider===provider && (selectedShipping.id||selectedShipping.service)===(q.id||q.service) ? "checked" : (!selectedShipping&&i===0?"checked":"");
    return `<label class="shipping-option"><input type="radio" name="shippingService" value="${key}" data-provider="${provider}" data-index="${i}" ${checked}><span><b>${q.name||q.service||"Entrega"}</b><small>${q.company||""}${q.delivery_time?` • até ${q.delivery_time} dias úteis`:q.eta?` • ${q.eta}`:""}</small></span><strong>${money(q.price)}</strong></label>`;
  }).join("")}</div>`;
  panel.querySelectorAll('input[name="shippingService"]').forEach(r=>r.addEventListener("change",()=>{
    const provider=r.dataset.provider; const idx=Number(r.dataset.index); const q=provider==="uber"?shippingQuotes.uber:shippingQuotes.melhor_envio[idx];
    selectedShipping={provider,...q,label:q.name||q.service||"Entrega"}; updateCheckoutTotals();
  }));
}
async function openCheckout(){
  // A forma de pagamento sempre começa sem pré-seleção a cada novo checkout.
  checkoutPayment=null;
  if(!cart.length){toast("Adicione pelo menos um produto.");return}
  if(!currentUser){ pendingCheckout=true; closeCart(); closeCartPage(); await openAccount(); if(!currentUser) switchAccountTab("login"); accountMessage("Para finalizar a compra, entre na sua conta ou crie um cadastro.", "login"); return; }
  closeCart(); closeCartPage();
  // A tela do carrinho não altera os produtos: ela apenas define a intenção de recebimento.
  if(cartPageReceiveMode==="pickup"){
    const pickupRadio=$('input[name="delivery"][value="pickup"]'); if(pickupRadio) pickupRadio.checked=true;
  } else if(selectedShipping && (selectedShipping.provider==="uber" || selectedShipping.provider==="melhor_envio")){
    const radio=$(`input[name="delivery"][value="${selectedShipping.provider}"]`); if(radio) radio.checked=true;
  }
  await renderCheckout(); const checkoutPage=$("#checkoutModal"); checkoutPage.classList.remove("hidden"); checkoutPage.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden";
}
function paymentMessage(order,data){ return ["Olá! Preciso de ajuda com o pagamento do meu pedido na Relpps Cosméticos.",`Pedido: ${order.id}`,`Cliente: ${data.name}`,`Total: ${money(order.totals.total)}`,`Status: Aguardando pagamento`].join("\n"); }
function releaseMessage(order){ const type=isPickupMethod(order.delivery.method)?"retirada":"entrega"; return ["Olá! Seu pagamento foi aprovado.",`Pedido ${order.id} foi liberado para ${type}.`,`Status: ${order.fulfillmentStatus}`].join("\n"); }
async function createCheckoutOrder(payload){
  const r=await fetch("/api/checkout?action=create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.message||"Não foi possível criar o pedido.");
  return data;
}
async function getCheckoutOrderStatus(id){
  const r=await fetch(`/api/checkout?action=status&order=${encodeURIComponent(id)}`,{cache:"no-store"});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.message||"Não foi possível consultar o pedido.");
  return data.order;
}
function showPaymentResult(order,data){
  lastCreatedOrder=order;
  $("#paymentResultTitle").textContent=order.status||"Aguardando pagamento";
  $("#paymentResultText").textContent=`Pedido ${order.id} criado. ${order.delivery.method==="pickup_uber"?"Após o pagamento aprovado, aguarde a liberação e solicite o Uber por sua conta.":isPickupMethod(order.delivery.method)?`Após o pagamento aprovado, ele será preparado para retirada. Local: ${order.delivery.pickupAddress||"Relpps Cosméticos — Taguatinga Centro, Brasília - DF"}.`:"Após o pagamento aprovado, ele será liberado para entrega."}`;
  const actions=$("#paymentResultActions");
  const online=data.payment==="pix_online" || data.payment==="card";
  const testButton=CHECKOUT_TEST_MODE && online ? '<button class="btn btn-gold full" id="simulatePaymentButton" type="button">SIMULAR PAGAMENTO APROVADO (TESTE)</button>' : "";
  actions.innerHTML=`${testButton}<button class="checkout-whatsapp-link" id="paymentWhatsAppButton" type="button">💬 Falar sobre pagamento no WhatsApp</button>`;
  $("#paymentWhatsAppButton").onclick=()=>window.open(whatsappLink(paymentMessage(order,data)),"_blank","noopener");
  $("#simulatePaymentButton")?.addEventListener("click",async()=>{
    lastCreatedOrder={...lastCreatedOrder,status:"Pagamento aprovado",paymentStatus:"APPROVED",fulfillmentStatus:isPickupMethod(lastCreatedOrder.delivery?.method)?"Liberado para preparação e retirada":"Liberado para preparação e entrega"};
    $("#paymentResultTitle").textContent="Pagamento aprovado ✓";
    $("#paymentResultText").textContent=isPickupMethod(lastCreatedOrder.delivery?.method)?"Teste aprovado. Em produção, a liberação será feita automaticamente pelo webhook do gateway.":"Teste aprovado. Em produção, o pedido será liberado automaticamente após o webhook do gateway.";
    actions.innerHTML='<button class="btn btn-gold full" type="button" data-close="paymentModal">PEDIDO LIBERADO</button>';
    actions.querySelector("[data-close]").onclick=()=>closeModal("paymentModal");
    toast("Pagamento aprovado no modo de teste.");
  });
  $("#paymentModal").classList.remove("hidden");
}
async function submitOrder(form){
  if(!currentUser){toast("Entre ou crie uma conta para finalizar a compra.");return;}
  const data=Object.fromEntries(new FormData(form).entries()); const method=data.delivery;
  if(!data.payment){toast("Escolha Pix, Cartão ou Dinheiro para continuar.");return;}
  checkoutPayment=data.payment;
  if(!isPickupMethod(method) && (!data.cep||!data.address||!data.number||!data.city)){toast("Preencha o endereço de entrega.");return;}
  if(!isPickupMethod(method) && !selectedShipping){toast("Calcule e selecione uma opção de frete.");return;}
  const totalsFinal=updateCheckoutTotals();
  const payload={
    status:"Aguardando pagamento",customer:{name:data.name,cpf:data.cpf,email:data.email,phone:data.phone},
    delivery:{method,cep:data.cep,address:data.address,number:data.number,complement:data.complement,district:data.district,city:data.city,shipping:selectedShipping},
    payment:data.payment,
    items:cart.map(i=>({productId:i.id,name:i.name,quantity:i.qty,unitPrice:i.price,variations:i.variations})),
    totals:totalsFinal,
    discounts:{
      automatic:totalsFinal.automaticDiscount||0,
      coupon:totalsFinal.couponDiscount||0,
      total:totalsFinal.discount||0,
      couponCode:totalsFinal.couponCode||null,
      rules:totalsFinal.automaticDiscountItems||[]
    }
  };
  const btn=$("#checkoutSubmitButton"); const old=btn.textContent; btn.disabled=true; btn.textContent="CRIANDO PEDIDO…";
  try{
    payload.customer.userId=currentUser?.id||null;
    const result=await createCheckoutOrder(payload);
    const order=result.order;
    renderLoyaltyDashboard(); renderMinhaRelppsPage();
    cart=[];saveCart();renderCart();closeModal("checkoutModal");
    if(result.paymentUrl && (data.payment==="pix_online" || data.payment==="card")){
      toast("Pedido criado. Redirecionando para o pagamento seguro…");
      setTimeout(()=>{window.location.href=result.paymentUrl;},250);
      return;
    }
    if(data.payment==="cash" || method==="pickup_uber") { window.location.href=`pedido.html?order=${encodeURIComponent(order.id)}`; return; }
    showPaymentResult(order,data);
    toast(data.payment==="cash"?"Pedido criado e aguardando pagamento na retirada.":"Pedido criado com status Aguardando pagamento.");
  }catch(e){toast(e.message||"Erro ao criar pedido.");}
  finally{btn.disabled=false;btn.textContent=old;}
}

function initHeaderSearchHideOnScroll(){
  const searchBox = document.querySelector(".search-box");
  const compact = document.querySelector("#compactSearchButton");
  if(!searchBox) return;
  const isMobile = () => window.matchMedia("(max-width: 600px)").matches;
  let ticking = false;
  const update = () => {
    const y = window.scrollY || 0;
    const scrolled = y > 20;
    if(isMobile()){
      searchBox.classList.remove("header-search-hidden");
      compact?.classList.add("is-visible");
    }else{
      searchBox.classList.toggle("header-search-hidden", scrolled);
      compact?.classList.toggle("is-visible", scrolled);
    }
    ticking = false;
  };
  update();
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, {passive:true});
  compact?.addEventListener("click",()=>{
    if(isMobile()){
      searchBox.classList.toggle("mobile-search-open");
      const input=document.querySelector("#searchInput");
      if(searchBox.classList.contains("mobile-search-open")){
        setTimeout(()=>input?.focus({preventScroll:true}),80);
      }else{
        input?.blur();
      }
      return;
    }
    window.scrollTo({top:0,behavior:"smooth"});
    setTimeout(()=>{
      const input=document.querySelector("#searchInput");
      input?.focus({preventScroll:true});
    },350);
  });
}

function initHeaderPremiumScroll(){
  const header=document.querySelector(".site-header");
  if(!header) return;
  let ticking=false;
  const update=()=>{
    header.classList.toggle("is-scrolled",(window.scrollY||0)>70);
    ticking=false;
  };
  update();
  window.addEventListener("scroll",()=>{
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(update);
  },{passive:true});
}

function initScrollAnimations(){
  const items=[...document.querySelectorAll(".reveal-item, .category-card, .benefits>div, .promo-banner, .brands, .service-card, footer")];
  if(!items.length)return;
  items.forEach((el,i)=>{if(!el.classList.contains("reveal-item"))el.classList.add("scroll-reveal"); el.style.setProperty("--reveal-delay", `${Math.min(i%6,5)*70}ms`);});
  if(!("IntersectionObserver" in window)){items.forEach(el=>el.classList.add("is-visible"));return;}
  const io=new IntersectionObserver((entries,obs)=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");obs.unobserve(entry.target);}})},{threshold:.12,rootMargin:"0px 0px -40px"});
  items.forEach(el=>io.observe(el));
}

const FUNNEL_CATEGORIES={
  unhas:{title:"Agora escolha o que você procura em Unhas",text:"Filtre o catálogo por uma categoria específica, sem ficar procurando em vários produtos.",items:[["géis","Géis e Alongamento","Builder, base, gel e alongamento"],["esmaltes","Esmaltes e Cores","Cores e esmaltes em gel"],["preparadores","Preparadores","Prep, primer e pH"],["top coat","Top Coat","Top coat e selantes para unhas"],["polygel","Polygel e Acrílico","Materiais para estrutura e extensão"],["lixas","Lixas e Brocas","Lixas, bits e ponteiras"],["moldes","Fibra, Tips e Moldes","Materiais para alongamento"],["acessórios","Acessórios e Decorações","Detalhes e complementos"],["ferramentas","Ferramentas","Alicates, pinças e espátulas"],["equipamentos","Cabines e Equipamentos","Cabines, motores e sugadores"],["kits","Kits para Unhas","Kits e combos para montar sua bancada"]]},
  cilios:{title:"Agora escolha o que você procura em Cílios",text:"Entre diretamente no tipo de produto que você precisa para sua técnica.",items:[["cílios","Cílios e Fios","Fio a fio, volumes e extensões"],["finalizadores","Finalizadores para Cílios","Produtos de acabamento e finalização da extensão"],["tufinhos","Tufinhos","Tamanhos e modelos de tufos"],["colas","Colas para Cílios","Fixação para diferentes técnicas"],["removedores","Removedores","Remoção segura da extensão"],["pinças","Pinças","Aplicação e isolamento"],["fita","Fitas e Pads","Proteção e preparação"],["preparadores","Pré e Pós Aplicação","Cleanser, primer e cuidados"],["acessórios","Acessórios","Escovinhas, anéis e aplicadores"],["kits","Kits para Cílios","Kits e combos para sua técnica"]]},
  sobrancelhas:{title:"Agora escolha o que você procura em Sobrancelhas",text:"Produtos organizados por técnica para facilitar sua compra.",items:[["henna","Henna e Pigmentos","Henna, cores e pigmentação"],["design","Design de Sobrancelhas","Mapeamento e marcação"],["laminação","Brow Lamination","Produtos para laminação"],["tintura","Tintura e Coloração","Tinturas, cores e oxidantes"],["pinças","Pinças e Ferramentas","Precisão para o design"],["laminas","Lâminas e Agulhas","Materiais específicos para técnica"],["acessórios","Acessórios","Réguas, linhas e complementos"],["cuidados","Cuidados e Finalização","Tratamento, fixação e acabamento"],["kits","Kits para Sobrancelhas","Kits e combos para design e cuidados"]]},
  equipamentos:{title:"Agora escolha o tipo de Equipamento",text:"Encontre rapidamente o equipamento ideal para seu espaço profissional.",items:[["cabines","Cabines","UV, LED e secagem"],["luminarias","Luminárias","Iluminação profissional"],["aspiradores","Aspiradores e Sugadores","Limpeza e conforto no atendimento"],["motores","Lixadeiras e Motores","Equipamentos elétricos"],["ferramentas","Ferramentas","Itens profissionais"],["acessórios","Acessórios","Suportes e complementos"]]}
};
function openFunnel(area){
  const data=FUNNEL_CATEGORIES[area]; if(!data)return;
  const box=$("#funnelCategorias"), title=$("#funnelTitle"), text=$("#funnelText"), eye=$("#funnelEyebrow"), options=$("#funnelOptions");
  if(!box||!options)return;
  eye.textContent=(area||"Categorias").toUpperCase(); title.textContent=data.title; text.textContent=data.text;
  options.innerHTML=data.items.map(([category,name,desc])=>`<button class="funnel-option" type="button" data-area="${area}" data-category="${category}"><b>${name}</b><small>${desc}</small></button>`).join("");
  box.classList.add("active"); $("#funnelClose")?.classList.remove("hidden");
  options.querySelectorAll(".funnel-option").forEach(btn=>btn.addEventListener("click",()=>selectCatalogPath(btn.dataset.area,btn.dataset.category,true)));
}
function closeFunnel(){ $("#funnelCategorias")?.classList.remove("active"); $("#funnelClose")?.classList.add("hidden"); }
function selectCatalogPath(area,category="",scroll=true){
  const areaAliases={"cilios":"cilios","cílios":"cilios","sobrancelha":"sobrancelhas","sobrancelhas":"sobrancelhas","unha":"unhas","unhas":"unhas","equipamento":"equipamentos","equipamentos":"equipamentos"};
  const normalized=areaAliases[slug(area)]||slug(area||"");
  currentArea=normalized; currentCategory=category||""; currentSearch=""; resetCatalogPage();
  if($("#searchInput")) $("#searchInput").value=""; if($("#catalogSearch")) $("#catalogSearch").value="";
  renderProducts(); closeAllMega(); closeMobileNav();
  if(scroll){ location.hash="produtos"; setTimeout(()=>document.querySelector("#produtos")?.scrollIntoView({behavior:"smooth",block:"start"}),0); }
}
function closeAllMega(){ $$(".nav-mega").forEach(x=>x.classList.remove("open")); }

function ensureMobileNav(){
  if(document.getElementById("mobileNavPanel")) return;
  const panel=document.createElement("div");
  panel.id="mobileNavPanel"; panel.className="mobile-nav-panel hidden";
  panel.innerHTML=`<div class="mobile-nav-backdrop" data-mobile-close></div><aside class="mobile-nav-sheet" role="dialog" aria-modal="true" aria-label="Menu de categorias">
      <div class="mobile-nav-benefits" aria-label="Benefícios da Relpps"><span>✦ Compra segura</span><b>•</b><span>🚚 Envio para todo Brasil</span><b>•</b><span>✦ Beleza profissional</span><b>•</b><span>💬 Atendimento humanizado</span></div>
    <div class="mobile-nav-head"><div><span>RELPPS COSMÉTICOS</span><b>Encontre o que você precisa</b></div><button type="button" class="mobile-nav-close" data-mobile-close aria-label="Fechar menu">×</button></div>
    <button type="button" class="mobile-nav-item" data-mobile-area="unhas"><span>✦</span><div><b>Unhas</b><small>Géis, esmaltes e acessórios</small></div><i>→</i></button>
    <button type="button" class="mobile-nav-item" data-mobile-area="cilios"><span>✦</span><div><b>Cílios</b><small>Fios, colas e finalizadores</small></div><i>→</i></button>
    <button type="button" class="mobile-nav-item" data-mobile-area="sobrancelhas"><span>✦</span><div><b>Sobrancelhas</b><small>Henna, design e brow</small></div><i>→</i></button>
    <button type="button" class="mobile-nav-item" data-mobile-area="equipamentos"><span>✦</span><div><b>Equipamentos</b><small>Cabines, luzes e ferramentas</small></div><i>→</i></button>
    <button type="button" class="mobile-nav-club" data-mobile-club>✦ CLUB RELPPS <small>Programa de fidelidade</small></button>
  </aside>`;
  document.body.appendChild(panel);
  panel.addEventListener("click",e=>{ if(e.target.closest("[data-mobile-close]")) closeMobileNav(); const item=e.target.closest("[data-mobile-area]"); if(item) selectCatalogPath(item.dataset.mobileArea,"",true); if(e.target.closest("[data-mobile-club]")){ closeMobileNav(); document.querySelector("#clube-relpps")?.scrollIntoView({behavior:"smooth",block:"start"}); } });
}
function openMobileNav(){ ensureMobileNav(); const p=document.getElementById("mobileNavPanel"); p?.classList.remove("hidden"); document.body.classList.add("mobile-nav-open"); $("#mobileMenu")?.setAttribute("aria-expanded","true"); }
function closeMobileNav(){ const p=document.getElementById("mobileNavPanel"); p?.classList.add("hidden"); document.body.classList.remove("mobile-nav-open"); $("#mobileMenu")?.setAttribute("aria-expanded","false"); }
function bindEvents(){
  $("#productGrid").addEventListener("click",e=>{const view=e.target.closest("[data-view]");const add=e.target.closest("[data-add]");if(view)openProduct(view.dataset.view);if(add)addToCart(add.dataset.add);});
  $$(".category-card").forEach(b=>b.addEventListener("click",()=>{const area=b.dataset.area||""; currentArea=area; currentCategory=""; currentSearch=""; resetCatalogPage(); openFunnel(area); document.querySelector("#funnelCategorias")?.scrollIntoView({behavior:"smooth",block:"center"});}));
  $$(".nav-bar a[data-category]").forEach(a=>a.addEventListener("click",()=>selectCatalogPath(a.dataset.area||"",a.dataset.category||"",false)));
  $$(".nav-bar a[data-area]").forEach(a=>a.addEventListener("click",()=>selectCatalogPath(a.dataset.area||"","",false)));
  $$(".nav-mega-trigger").forEach(btn=>btn.addEventListener("click",e=>{e.preventDefault(); const wrap=btn.closest(".nav-mega"); const was=wrap.classList.contains("open"); closeAllMega(); if(!was)wrap.classList.add("open");}));
  $$(".mega-links button,.mega-all").forEach(btn=>btn.addEventListener("click",()=>selectCatalogPath(btn.dataset.area||"",btn.dataset.category||"",true)));
  $("#funnelClose")?.addEventListener("click",closeFunnel);
  document.addEventListener("click",e=>{if(!e.target.closest(".nav-mega")) closeAllMega();});
  const runSearch=()=>{currentSearch=$("#searchInput").value.trim();$("#catalogSearch").value=currentSearch;resetCatalogPage();renderProducts();location.hash="produtos"};
  $("#searchButton").onclick=runSearch;
  $("#searchInput").addEventListener("input",()=>{currentSearch=$("#searchInput").value;$("#catalogSearch").value=currentSearch;resetCatalogPage();renderProducts()});
  $("#searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")runSearch()});
  $("#catalogSearch").addEventListener("input",()=>{currentSearch=$("#catalogSearch").value;$("#searchInput").value=currentSearch;resetCatalogPage();renderProducts()});
  $("#catalogSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();location.hash="produtos"}});
  $("#areaFilter").addEventListener("change",e=>{currentArea=e.target.value;currentCategory="";currentSearch="";$("#searchInput").value="";$("#catalogSearch").value="";resetCatalogPage();renderProducts()});
  $("#categoryFilter").addEventListener("change",e=>{currentCategory=e.target.value;currentSearch="";$("#searchInput").value="";$("#catalogSearch").value="";resetCatalogPage();renderProducts()});
  $("#brandFilter").addEventListener("change",e=>{currentBrand=canonicalBrandKey(e.target.value);currentSearch="";$("#searchInput").value="";$("#catalogSearch").value="";resetCatalogPage();renderProducts()});
  $$(".catalog-chip").forEach(chip=>chip.addEventListener("click",()=>{currentArea=chip.dataset.filterArea||"";currentCategory=chip.dataset.filterCategory||"";currentSearch="";$("#searchInput").value="";$("#catalogSearch").value="";resetCatalogPage();renderProducts()}));
  document.addEventListener("click",(event)=>{const btn=event.target.closest("[data-brand-filter]");if(!btn)return;currentBrand=canonicalBrandKey(btn.dataset.brandFilter||"");currentSearch="";if($("#searchInput"))$("#searchInput").value="";if($("#catalogSearch"))$("#catalogSearch").value="";resetCatalogPage();renderProducts();location.hash="produtos";setTimeout(()=>document.querySelector("#produtos")?.scrollIntoView({behavior:"smooth",block:"start"}),0);});
  $("#clearFilter").onclick=()=>{currentArea="";currentCategory="";currentBrand="";currentSearch="";$("#searchInput").value="";$("#catalogSearch").value="";resetCatalogPage();renderProducts()};
  $("#modalAdd").onclick=()=>{if(activeProduct){addToCart(activeProduct.id,selectedVariations);closeModal("productModal");openCart()}};
  $("#cartButton").onclick=openCart;$("#floatingCart").onclick=openCart;$("#closeCart").onclick=closeCart;$("#drawerBackdrop").onclick=closeCart;$("#checkoutButton").onclick=openCartPage;
  $("#cartPageBack")?.addEventListener("click",closeCartPage);
  $("#cartPageHomeMobile")?.addEventListener("click",closeAllDedicatedPages);
  $("#checkoutPageBack")?.addEventListener("click",()=>{ closeModal("checkoutModal"); openCartPage(); });
  $("#checkoutPageHomeMobile")?.addEventListener("click",closeAllDedicatedPages); $("#cartPageQuoteButton")?.addEventListener("click",quoteCartPageShipping); $("#cartPageCep")?.addEventListener("input",e=>{e.target.value=formatCep(e.target.value)});
  $$('input[name="cartPageReceiveMode"]').forEach(r=>r.addEventListener("change",()=>{cartPageReceiveMode=r.value; updateCartPageReceiveUI();}));
  $("#cartPageContinue")?.addEventListener("click",async()=>{ const snapshot=cart.map(i=>i.key); await openCheckout(); if(snapshot.join("|")!==cart.map(i=>i.key).join("|")){ renderCart(); renderCartPage(); } });
  $("#cartPageItems")?.addEventListener("click",e=>{const b=e.target.closest("[data-cart-page-qty]");if(!b)return;const item=cart.find(i=>i.key===b.dataset.cartPageQty);if(!item)return;item.qty+=Number(b.dataset.change);if(item.qty<=0)cart=cart.filter(i=>i.key!==item.key);if(item&&item.qty>item.stock)item.qty=item.stock;saveCart();renderCart();renderCartPage();});
  $("#continueShoppingButton")?.addEventListener("click",continueShopping); $("#backToSiteButton")?.addEventListener("click",continueShopping); $("#cartContinueTop")?.addEventListener("click",continueShopping);
  $("#catalogPagination")?.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(!b||b.disabled)return;currentPage=Math.max(1,Number(b.dataset.page)||1);renderProducts();document.querySelector("#produtos")?.scrollIntoView({behavior:"smooth",block:"start"});});
  $("#cartRelated")?.addEventListener("click",e=>{const add=e.target.closest("[data-related-add]");const view=e.target.closest("[data-related-view]");if(add){addToCart(add.dataset.relatedAdd);return;}if(view){closeCart();openProduct(view.dataset.relatedView);}});
  $("#cartItems").addEventListener("click",e=>{const b=e.target.closest("[data-qty]");if(!b)return;const item=cart.find(i=>i.key===b.dataset.qty);if(!item)return;item.qty+=Number(b.dataset.change);if(item.qty<=0)cart=cart.filter(i=>i.key!==item.key);if(item.qty>item.stock)item.qty=item.stock;saveCart();renderCart()});
  $$("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
  $$(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));
  $("#accountBtn").onclick=async()=>{pendingCheckout=false;await openAccount();};
  $("#clubAccountButton")?.addEventListener("click",async()=>{pendingCheckout=false;await openAccount();if(!currentUser)switchAccountTab("register");});
  $("#clubForm")?.addEventListener("submit",e=>{e.preventDefault();const email=$("#clubEmail").value.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast("Digite um e-mail válido.");return;}localStorage.setItem("relpps-club-newsletter",email);toast("Pronto! Você entrou na lista de novidades da Relpps.");e.currentTarget.reset();});
  $$(".club-reward-card").forEach(btn=>btn.addEventListener("click",()=>redeemLoyaltyReward(Number(btn.dataset.rewardPoints),Number(btn.dataset.rewardValue))));
  $$(".account-tab").forEach(t=>t.addEventListener("click",()=>switchAccountTab(t.dataset.accountTab)));
  $("#registerForm").addEventListener("submit",handleRegister);
  $("#loginForm").addEventListener("submit",handleLogin);
  $("#accountCep").addEventListener("blur",lookupAccountCep);
  $("#useAccountButton").onclick=async()=>{pendingCheckout=false;closeModal("accountModal");await openCheckout()};
  $("#logoutButton").onclick=logoutAccount;
  $$('input[name="addressChoice"]').forEach(r=>r.addEventListener("change",()=>{
    updateAddressChoiceUI();
    if(r.value==="new") {
      const f=$("#checkoutForm");
      ["cep","address","number","complement","district","city"].forEach(k=>{ if(f.elements[k]) f.elements[k].value=""; });
      if(f.elements.cep) f.elements.cep.focus();
    }
  }));
  $("#whatsappCta")?.setAttribute("href",whatsappLink()); const floatingWa=$("#floatingWhatsApp"); if(floatingWa) floatingWa.href=whatsappLink("Olá! Vim pelo site da Relpps Cosméticos e preciso de atendimento.");
  $$('input[name="delivery"]').forEach(r=>r.addEventListener("change",updateDeliveryUI));
  $("#cep").addEventListener("input",e=>{e.target.value=formatCep(e.target.value)});
  $("#cep").addEventListener("blur",lookupCep);
  $("#quoteShippingButton")?.addEventListener("click",quoteShipping);
  $("#checkoutWhatsAppButton")?.addEventListener("click",()=>window.open(whatsappLink("Olá! Preciso de ajuda para finalizar meu pedido na Relpps Cosméticos."),"_blank","noopener"));
  $("#checkoutForm").addEventListener("submit",e=>{e.preventDefault();submitOrder(e.target)});
  $("#mobileMenu").onclick=()=>{ const p=document.getElementById("mobileNavPanel"); if(p && !p.classList.contains("hidden")) closeMobileNav(); else openMobileNav(); };
}

function initHeroSlider(){
  const track=document.querySelector('.hero-slides');
  const slides=[...document.querySelectorAll('.hero-slide')];
  const dots=[...document.querySelectorAll('.hero-dot')];
  if(!track||!slides.length)return;
  let index=0, timer;
  const show=(n)=>{
    index=(n+slides.length)%slides.length;
    track.style.transform=`translate3d(${-index*100}%,0,0)`;
    slides.forEach((el,i)=>el.classList.toggle('active',i===index));
    dots.forEach((el,i)=>el.classList.toggle('active',i===index));
  };
  const restart=()=>{clearInterval(timer);timer=setInterval(()=>show(index+1),5200)};
  document.querySelector('.hero-prev')?.addEventListener('click',()=>{show(index-1);restart()});
  document.querySelector('.hero-next')?.addEventListener('click',()=>{show(index+1);restart()});
  dots.forEach((d,i)=>d.addEventListener('click',()=>{show(i);restart()}));
  track.addEventListener('mouseenter',()=>clearInterval(timer));
  track.addEventListener('mouseleave',restart);
  show(0);restart();
}

loadCart();$("#year").textContent=new Date().getFullYear();ensureMobileNav();updateAccountButton();renderProducts();renderCart();bindEvents();loadProducts();initHeroSlider();initCloudAuth();initHeaderSearchHideOnScroll();initHeaderPremiumScroll();setTimeout(initScrollAnimations,0);

// ---------------------------------------------------------
// Luxe front-end helpers: newsletter, links and image loading.
// ---------------------------------------------------------
function initClubRelpps(){
  const form=$("#clubForm"), input=$("#clubEmail");
  if(!form||!input) return;
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const email=String(input.value||"").trim().toLowerCase();
    if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)){
      input.focus();
      toast("Digite um e-mail válido para receber novidades do Club Relpps.");
      return;
    }
    try{
      const saved=JSON.parse(localStorage.getItem("relpps-club-emails")||"[]");
      const list=Array.isArray(saved)?saved:[];
      if(!list.includes(email)) list.push(email);
      localStorage.setItem("relpps-club-emails",JSON.stringify(list));
    }catch(_){/* newsletter continua funcionando visualmente */}
    input.value="";
    toast("Pronto! Você entrou no Club Relpps ✦");
  });
}

function initFooterCheckoutLink(){
  const link=$("#footerCheckoutLink");
  if(!link) return;
  link.addEventListener("click",e=>{e.preventDefault();openCart();});
}

function initImageLoading(){
  const images=$$("img");
  images.forEach((img,index)=>{
    if(index>1 && !img.hasAttribute("loading")) img.loading="lazy";
    img.decoding="async";
  });
}

// ===== RELPPS ULTRA PHOTO RESOLVER =====
// Não reduzimos mais a foto pequena. A loja tenta automaticamente encontrar uma
// variante original/sem thumbnail do mesmo endereço e escolhe a maior que carregar.
// Assim, quando o Bling/CDN expõe a original por outra URL, ela substitui a miniatura.
function imageUrlVariants(src){
  const raw=String(src||'').trim();
  if(!/^https?:\/\//i.test(raw)) return [raw];
  const out=[]; const add=v=>{if(v&&!out.includes(v))out.push(v)};
  add(raw);
  try{
    const u=new URL(raw);
    const clean=new URL(raw);
    ['w','h','width','height','resize','size','thumbnail','thumb','quality','q'].forEach(k=>clean.searchParams.delete(k));
    add(clean.toString());
    const path=u.pathname;
    [
      path.replace(/thumbnail/ig,'original'),
      path.replace(/miniatura/ig,'original'),
      path.replace(/preview/ig,'original'),
      path.replace(/thumb/ig,'image'),
      path.replace(/\/small\//ig,'/original/'),
      path.replace(/\/resize\//ig,'/original/')
    ].forEach(pathname=>{
      if(pathname===path) return;
      const v=new URL(clean.toString()); v.pathname=pathname; add(v.toString());
    });
  }catch{}
  return out.slice(0,8);
}
function loadImageProbe(src,timeout=7000){
  return new Promise(resolve=>{
    const probe=new Image(); let done=false;
    const finish=ok=>{if(done)return;done=true;resolve(ok?{src,w:probe.naturalWidth||0,h:probe.naturalHeight||0}:null)};
    const t=setTimeout(()=>finish(false),timeout);
    probe.onload=()=>{clearTimeout(t);finish(true)};
    probe.onerror=()=>{clearTimeout(t);finish(false)};
    probe.src=src;
  });
}
async function resolveBestProductImage(img){
  if(!img || img.dataset.relppsResolved==='1') return;
  img.dataset.relppsResolved='1';
  const current=img.currentSrc||img.src;
  const variants=imageUrlVariants(current);
  if(variants.length<2) return;
  const results=await Promise.all(variants.map(v=>loadImageProbe(v)));
  const best=results.filter(Boolean).sort((a,b)=>(b.w*b.h)-(a.w*a.h))[0];
  if(best && best.src && (best.w*best.h)>(img.naturalWidth||0)*(img.naturalHeight||0)*1.15){
    img.src=best.src;
    img.dataset.relppsResolvedFrom='larger-source';
  }
}
function applyPremiumImageSize(img){
  if(!img || !img.naturalWidth || !img.naturalHeight) return;
  const w=Number(img.naturalWidth), h=Number(img.naturalHeight);
  img.dataset.relppsNaturalWidth=String(w);
  img.dataset.relppsNaturalHeight=String(h);
  // A foto ocupa a galeria inteira; não existe mais limite de 70px/thumbnail.
  img.classList.remove('relpps-source-small');
  img.classList.add('relpps-source-full');
}
function keepProductImageSharp(img){
  if(!img || img.dataset.relppsSharpBound) return;
  img.dataset.relppsSharpBound='1';
  const apply=()=>{applyPremiumImageSize(img);resolveBestProductImage(img)};
  img.addEventListener('load',apply);
  if(img.complete && img.naturalWidth) apply();
}
function initProductImageSharpness(){
  const scan=()=>document.querySelectorAll('.product-main-media img,.modal-image-wrap img,.product-image img,.product-thumb img').forEach(keepProductImageSharp);
  scan();
  const observer=new MutationObserver(scan);
  observer.observe(document.body,{childList:true,subtree:true});
}

initClubRelpps();
initFooterCheckoutLink();
initImageLoading();
initProductImageSharpness();

// =========================================================
// CHECKOUT RELPPS EM 3 ETAPAS (FRONT-END VISUAL)
// Dados → Recebimento → Pagamento
// =========================================================
let checkoutStage = 1;

function checkoutRequiredFields(names){
  const form=$("#checkoutForm");
  if(!form) return true;
  for(const name of names){
    const field=form.elements[name];
    if(!field) continue;
    if(!field.checkValidity()){
      field.reportValidity();
      field.focus();
      return false;
    }
  }
  return true;
}

function renderPaymentVisual(payment){
  const box=$("#paymentVisualDetails");
  if(!box) return;
  if(!payment){ box.innerHTML=""; box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  if(payment==="pix_online"){
    box.innerHTML=`<div class="payment-detail-head"><div><b>Pagamento via Pix</b><small>Rápido, seguro e com confirmação online.</small></div><span>✦ PIX</span></div><div class="payment-detail-body"><div class="pix-visual"><div class="pix-code-mock" aria-label="Prévia visual do QR Code"></div><div class="pix-copy"><b>Seu QR Code aparecerá aqui</b><p>Esta é uma prévia visual. Na próxima etapa da integração, o QR Code e o código Copia e Cola serão gerados automaticamente pelo provedor de pagamento.</p><span class="pix-pill">GERAÇÃO SEGURA NO CHECKOUT</span></div></div></div>`;
  }else if(payment==="card"){
    box.innerHTML=`<div class="payment-detail-head"><div><b>Dados do cartão</b><small>Prévia do formulário que será conectado ao provedor de pagamento.</small></div><span>▣ CARTÃO</span></div><div class="payment-detail-body"><div class="payment-visual-grid"><label class="wide">Nome impresso no cartão<input type="text" placeholder="Como está no cartão" autocomplete="cc-name"></label><label class="wide">Número do cartão<input type="text" inputmode="numeric" placeholder="0000 0000 0000 0000" autocomplete="cc-number" maxlength="19"></label><label>Validade<input type="text" inputmode="numeric" placeholder="MM/AA" autocomplete="cc-exp" maxlength="5"></label><label>CVV<input type="password" inputmode="numeric" placeholder="•••" autocomplete="cc-csc" maxlength="4"></label></div></div>`;
  }else if(payment==="cash"){
    box.innerHTML=`<div class="payment-detail-head"><div><b>Pagamento em dinheiro</b><small>Disponível somente para retirada presencial.</small></div><span>💵 RETIRADA</span></div><div class="payment-detail-body"><div class="cash-visual"><b>Você pagará no momento da retirada.</b><p>Após a confirmação do pedido, ele será preparado para retirada. A integração final poderá atualizar automaticamente o status no Bling após a confirmação do pagamento.</p></div></div>`;
  }
}

function renderPaymentOptions(method){
  const box=$("#paymentOptions"); if(!box)return;
  let current=checkoutPayment || $("input[name=payment]:checked")?.value || null;
  const opts=[
    ["pix_online","Pix","Pagamento online seguro e rápido."],
    ["card","Cartão","Preencha os dados no checkout seguro."]
  ];
  if(method==="pickup") opts.push(["cash","Dinheiro","Pagamento no momento da retirada presencial."]);
  if(!opts.some(x=>x[0]===current)){ current=null; checkoutPayment=null; }
  box.innerHTML=opts.map(o=>`<label class="payment-option"><input type="radio" name="payment" value="${o[0]}" ${current===o[0]?"checked":""}><span><b>${o[1]}</b><small>${o[2]}</small></span></label>`).join("");
  box.querySelectorAll('input[name="payment"]').forEach(r=>r.addEventListener("change",()=>{checkoutPayment=r.value; renderPaymentVisual(r.value); updateCheckoutTotals(); updateCheckoutStageSummary();}));
  renderPaymentVisual(current);
  const note=$("#paymentNote");
  if(note) note.textContent=method==="pickup"
    ?"Para retirada presencial, Pix, Cartão ou Dinheiro estão disponíveis."
    :"Escolha Pix ou Cartão. Os dados reais serão conectados ao provedor seguro na próxima etapa.";
}

function updateCheckoutStageSummary(){
  const hint=$("#checkoutStageSummaryHint"), submit=$("#checkoutSubmitButton");
  if(!hint||!submit) return;
  submit.classList.toggle("hidden",checkoutStage!==3);
  if(checkoutStage===1) hint.textContent="Complete seus dados para avançar para a próxima etapa.";
  else if(checkoutStage===2) hint.textContent="Escolha como deseja receber. Para entrega, calcule e selecione o frete antes de continuar.";
  else hint.textContent="Escolha a forma de pagamento e revise o pedido antes de finalizar.";
}

function setCheckoutStage(stage, scroll=true){
  checkoutStage=Math.max(1,Math.min(3,Number(stage)||1));
  $$("[data-checkout-stage]").forEach(el=>el.classList.toggle("is-active",Number(el.dataset.checkoutStage)===checkoutStage));
  const progress=$$(".checkout-progress span");
  progress.forEach((el,index)=>{
    const n=index+1;
    el.classList.toggle("active",n===checkoutStage);
    el.classList.toggle("is-complete",n<checkoutStage);
    el.setAttribute("aria-current",n===checkoutStage?"step":"false");
  });
  updateCheckoutStageSummary();
  if(scroll){
    document.querySelector(".checkout-page-title")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
}

function validateCheckoutDataStage(){
  return checkoutRequiredFields(["name","cpf","email","phone"]);
}

function validateCheckoutReceiveStage(){
  const method=getSelectedDeliveryMethod();
  if(isPickupMethod(method)) return true;
  if(!checkoutRequiredFields(["cep","address","number","district","city"])) return false;
  if(!selectedShipping){ toast("Calcule e selecione Uber Entregas ou Correios antes de continuar."); return false; }
  return true;
}

function initCheckoutStages(){
  $("#checkoutToReceive")?.addEventListener("click",()=>{
    if(!validateCheckoutDataStage()) return;
    setCheckoutStage(2);
  });
  $("#checkoutBackToData")?.addEventListener("click",()=>setCheckoutStage(1));
  $("#checkoutToPayment")?.addEventListener("click",()=>{
    if(!validateCheckoutReceiveStage()) return;
    updateDeliveryUI();
    setCheckoutStage(3);
  });
  $("#checkoutBackToReceive")?.addEventListener("click",()=>setCheckoutStage(2));
  $("#checkoutSubmitButton")?.addEventListener("click",()=>{
    const payment=$("input[name=payment]:checked")?.value;
    if(!payment){ toast("Escolha Pix, Cartão ou Dinheiro para continuar."); return; }
    const form=$("#checkoutForm");
    if(form) submitOrder(form);
  });
  $$(".checkout-progress span").forEach((el,index)=>el.addEventListener("click",()=>{
    const target=index+1;
    if(target<checkoutStage) setCheckoutStage(target);
    else if(target===2 && checkoutStage===1 && validateCheckoutDataStage()) setCheckoutStage(2);
    else if(target===3 && checkoutStage===2 && validateCheckoutReceiveStage()) setCheckoutStage(3);
  }));
  setCheckoutStage(1,false);
}

initCheckoutStages();

// =========================================================
// PÁGINA DEDICADA DO PRODUTO — galeria, favoritos e avaliações
// =========================================================
let productPageActive = null;
let productPageVars = {};
let productPageQty = 1;
let productGalleryImages = [];
let productGalleryIndex = 0;
let pendingFavoriteId = null;

function productGalleryFor(p){
  const images=[];
  const push=(src)=>{
    if(!src || images.includes(src)) return;
    const value=String(src).trim();
    // Evita arquivos de identidade/hero entrando por engano como foto de produto.
    if(/relpps-logo|logo-completa|hero-[123]\.svg/i.test(value)) return;
    images.push(value);
  };
  (p?.images||[]).forEach(push);
  push(p?.image);
  (p?.variationItems||[]).forEach(item=>{(item?.images||[]).forEach(push);push(item?.image);});
  return images.length?images:[safeImageFallback()];
}
function reviewStorageKey(id){return `relpps-product-reviews-${id}`}
function favoriteStorageKey(){return `relpps-favorites-${currentUser?.id||currentUser?.email||"guest"}`}
function getReviews(id){try{const v=JSON.parse(localStorage.getItem(reviewStorageKey(id))||"[]");return Array.isArray(v)?v:[]}catch{return []}}
function saveReviews(id,list){localStorage.setItem(reviewStorageKey(id),JSON.stringify(list))}
function getFavorites(){try{const v=JSON.parse(localStorage.getItem(favoriteStorageKey())||"[]");return Array.isArray(v)?v:[]}catch{return []}}
function renderProductGallery(){
  if(!productPageActive)return;
  const img=productGalleryImages[productGalleryIndex]||productPageActive.image;
  const main=$("#productPageImage"), thumbs=$("#productThumbnails"), badge=$("#productImageBadge");
  if(main){
    main.style.opacity="0";
    setTimeout(()=>{
      main.onerror=()=>{main.onerror=null;main.src=safeImageFallback();};
      main.src=img; main.alt=productPageActive.name; main.style.opacity="1";
    },80)
  }
  if(badge) badge.textContent=`Foto ${productGalleryIndex+1} de ${productGalleryImages.length}`;
  if(thumbs) thumbs.innerHTML=productGalleryImages.map((src,i)=>`<button type="button" class="product-thumb ${i===productGalleryIndex?"active":""}" data-gallery-index="${i}" aria-label="Ver foto ${i+1}"><img src="${src}" alt="${productPageActive.name} — foto ${i+1}" loading="lazy"></button>`).join("");
}
function renderProductPageVariations(){
  const area=$("#productPageVariations"); if(!area||!productPageActive)return;
  area.innerHTML="";
  Object.entries(productPageActive.variations||{}).forEach(([name,values])=>{
    const group=document.createElement("div");group.className="variation-group";group.dataset.variationName=name;
    group.innerHTML=`<h4>${name}</h4><div class="variation-list"></div>`;
    const list=$(".variation-list",group);
    (values||[]).forEach(value=>{
      const b=document.createElement("button");b.type="button";b.className="variation-btn";b.dataset.value=value;b.textContent=value;
      b.classList.toggle("selected",slug(productPageVars[name])===slug(value));
      b.addEventListener("click",()=>{productPageVars[name]=value;refreshProductPageVariationUI();});
      list.appendChild(b);
    });
    area.appendChild(group);
  });
}
function refreshProductPageVariationUI(){
  if(!productPageActive)return;
  $$(".variation-group",$("#productPageVariations")).forEach(group=>{
    const name=group.dataset.variationName;
    $$(".variation-btn",group).forEach(btn=>{
      btn.classList.toggle("selected",slug(productPageVars[name])===slug(btn.dataset.value));
      if(productPageActive.variationItems?.length){btn.disabled=!variationValueAvailable(productPageActive,name,btn.dataset.value,productPageVars);}
    });
  });
  const item=getSelectedVariationItem(productPageActive,productPageVars);
  const price=getVariationPrice(productPageActive,productPageVars), stock=getVariationStock(productPageActive,productPageVars);
  $("#productPagePrice").textContent=money(price);
  $("#productPageStock").textContent=stock>0?(stock>0?(Number(stock)<=5?"Últimas unidades":"Disponível"):"Esgotado"):("Esgotado");
  $("#productPageAdd").disabled=stock<=0;
  if(item?.image){const i=productGalleryImages.indexOf(item.image);if(i>=0){productGalleryIndex=i;renderProductGallery();}}
}
function renderProductDetails(){
  const p=productPageActive;if(!p)return;
  const description=$("#productTabDescription"), details=$("#productTabDetails");
  if(description){const text=p.description||"Produto selecionado para uma rotina profissional, com informações sincronizadas do catálogo.";description.innerHTML=text.split(/\n{2,}/).map(part=>`<p>${escapeHtml(part)}</p>`).join("");}
  const rows=productRawDetailRows(p);
  if(p.variations&&Object.keys(p.variations).length) rows.push(["Variações",Object.entries(p.variations).map(([k,v])=>`${k}: ${(v||[]).join(" / ")}`).join(" • ")]);
  if(details) details.innerHTML=`<div class="product-details-table">${rows.map(([a,b])=>`<div>${a}</div><div>${b}</div>`).join("")}</div>`;
}
function renderFavoriteButton(){
  const btn=$("#productFavoriteButton");if(!btn||!productPageActive)return;
  const saved=currentUser?getFavorites().includes(String(productPageActive.id)):false;
  btn.classList.toggle("saved",saved);btn.innerHTML=`<span>${saved?"♥":"♡"}</span> ${saved?"Produto salvo na sua conta":"Salvar produto"}`;
}
function renderProductReviews(){
  const p=productPageActive;if(!p)return;const list=getReviews(p.id);const box=$("#productReviewList");
  const avg=list.length?list.reduce((s,r)=>s+Number(r.rating||0),0)/list.length:5;
  $("#productReviewAverage").textContent=avg.toFixed(1).replace(".",",");
  $("#productReviewCount").textContent=`${list.length||0} ${list.length===1?"avaliação":"avaliações"}`;
  $("#productPageStars").textContent="★★★★★";
  if(!list.length){box.innerHTML='<div class="review-empty">Ainda não há avaliações deste produto. Seja a primeira pessoa a compartilhar sua experiência.</div>';return;}
  box.innerHTML=list.slice().reverse().map(r=>`<article class="review-card"><div class="review-card-head"><div><b>${escapeHtml(r.name||"Cliente Relpps")}</b><div class="stars">${"★".repeat(Number(r.rating||5))}${"☆".repeat(5-Number(r.rating||5))}</div></div><time>${escapeHtml(r.date||"")}</time></div><p>${escapeHtml(r.comment||"")}</p>${Array.isArray(r.images)&&r.images.length?`<div class="review-images">${r.images.map(src=>`<img src="${src}" alt="Foto enviada na avaliação" loading="lazy">`).join("")}</div>`:""}</article>`).join("");
}
function escapeHtml(value){return String(value||"").replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]))}
function openProduct(id){
  const p=products.find(x=>String(x.id)===String(id));if(!p)return;
  productPageActive=p;activeProduct=p;productPageQty=1;productPageVars={};
  const first=p.variationItems?.find(x=>Number(x.stock)>0)||p.variationItems?.[0];
  if(first?.variations) productPageVars={...first.variations}; else Object.entries(p.variations||{}).forEach(([k,v])=>{if(v?.length)productPageVars[k]=v[0]});
  productGalleryImages=productGalleryFor(p);productGalleryIndex=0;
  $("#productPageArea").textContent=formatDisplayLabel(p.area||"Produtos");$("#productPageCrumb").textContent=p.name;$("#productPageCategory").textContent=[p.area,p.category].filter(Boolean).map(formatDisplayLabel).join(" · ");$("#productPageBrand").textContent=p.brand||"";$("#productPageName").textContent=p.name;$("#productPageDescription").textContent=p.description||"";$("#productQtyValue").textContent="1";
  renderProductGallery();renderProductPageVariations();refreshProductPageVariationUI();renderProductDetails();renderProductReviews();renderFavoriteButton();
  $("#productPageCartCount").textContent=cart.reduce((s,i)=>s+i.qty,0);
  const page=$("#productPage");page.classList.remove("hidden");page.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";page.scrollTop=0;
}
function closeAllDedicatedPages(){
  ["productPage","cartPage","checkoutModal"].forEach(id=>{
    const el=$("#"+id);
    if(el){el.classList.add("hidden");el.setAttribute("aria-hidden","true");}
  });
  closeModal("productModal");
  closeCart();
  productPageActive=null;
  document.body.style.overflow="";
  window.scrollTo({top:0,behavior:"smooth"});
  if(location.hash!=="#inicio") history.replaceState(null,"","#inicio");
}
function closeProductPage(){const page=$("#productPage");if(!page)return;page.classList.add("hidden");page.setAttribute("aria-hidden","true");document.body.style.overflow="";productPageActive=null;}
let addedModalTimer=null;
function relatedProductsFor(p){
  const source=[...products].filter(x=>String(x.id)!==String(p?.id)&&Number(x.stock)>0);
  return source.sort((a,b)=>{
    const score=x=>(x.brand===p.brand?4:0)+(slug(x.area)===slug(p.area)?3:0)+(slug(x.category)===slug(p.category)?2:0);
    return score(b)-score(a)||Number(b.stock)-Number(a.stock);
  }).slice(0,12);
}
function renderAddedRelated(){
  const box=$("#addedRelatedTrack");if(!box||!productPageActive)return;
  const items=relatedProductsFor(productPageActive);
  box.innerHTML=items.length?items.map(p=>`<article class="added-related-card"><button class="added-related-view" data-added-view="${p.id}" type="button" aria-label="Ver ${escapeHtml(p.name)}"><img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy"></button><b>${escapeHtml(p.name)}</b><span>${money(p.price)}</span><button type="button" data-added-add="${p.id}">ADICIONAR</button></article>`).join(""):'<div class="review-empty">Em breve teremos mais sugestões para você.</div>';
}
function showAddedToCartModal(){
  if(!productPageActive)return;const modal=$("#addedToCartModal");if(!modal)return;
  $("#addedToCartProductName").textContent=productPageActive.name;renderAddedRelated();modal.classList.remove("hidden");document.body.style.overflow="hidden";
  if(addedModalTimer)clearInterval(addedModalTimer);const track=$("#addedRelatedTrack");
  addedModalTimer=setInterval(()=>{if(!modal.classList.contains("hidden")&&!document.hidden&&track){const card=track.querySelector(".added-related-card");track.scrollBy({left:(card?.offsetWidth||205)+14,behavior:"smooth"});if(track.scrollLeft+track.clientWidth>=track.scrollWidth-8)track.scrollTo({left:0,behavior:"smooth"});}},4200);
}
function closeAddedToCartModal(){const modal=$("#addedToCartModal");if(modal)modal.classList.add("hidden");if(addedModalTimer){clearInterval(addedModalTimer);addedModalTimer=null;}if(!$("#productPage")?.classList.contains("hidden"))document.body.style.overflow="hidden";}

function initProductPage(){
  $("#productPageBack")?.addEventListener("click",closeProductPage);
  $("#productPageHomeMobile")?.addEventListener("click",closeAllDedicatedPages);
  $("#productBreadcrumbHome")?.addEventListener("click",()=>{closeProductPage();location.hash="produtos";});
  $$(".page-home-logo").forEach(el=>el.addEventListener("click",e=>{e.preventDefault();closeAllDedicatedPages();}));

  $("#productPageCart")?.addEventListener("click",()=>{closeProductPage();openCart();});
  $("#productGalleryPrev")?.addEventListener("click",()=>{if(!productGalleryImages.length)return;productGalleryIndex=(productGalleryIndex-1+productGalleryImages.length)%productGalleryImages.length;renderProductGallery();});
  $("#productGalleryNext")?.addEventListener("click",()=>{if(!productGalleryImages.length)return;productGalleryIndex=(productGalleryIndex+1)%productGalleryImages.length;renderProductGallery();});
  $("#productThumbnails")?.addEventListener("click",e=>{const b=e.target.closest("[data-gallery-index]");if(!b)return;productGalleryIndex=Number(b.dataset.galleryIndex)||0;renderProductGallery();});
  $("#productQtyMinus")?.addEventListener("click",()=>{productPageQty=Math.max(1,productPageQty-1);$("#productQtyValue").textContent=productPageQty;});
  $("#productQtyPlus")?.addEventListener("click",()=>{const stock=getVariationStock(productPageActive,productPageVars);productPageQty=Math.min(Math.max(1,stock),productPageQty+1);$("#productQtyValue").textContent=productPageQty;});
  $("#productPageAdd")?.addEventListener("click",()=>{if(!productPageActive)return;for(let i=0;i<productPageQty;i++)addToCart(productPageActive.id,productPageVars);$("#productPageCartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);showAddedToCartModal();});
  $("#productFavoriteButton")?.addEventListener("click",async()=>{if(!productPageActive)return;if(!currentUser){pendingFavoriteId=productPageActive.id;await openAccount();toast("Entre na sua conta para salvar seus produtos favoritos.");return;}const fav=getFavorites(),id=String(productPageActive.id),i=fav.indexOf(id);if(i>=0)fav.splice(i,1);else fav.push(id);localStorage.setItem(favoriteStorageKey(),JSON.stringify(fav));renderFavoriteButton();toast(i>=0?"Produto removido dos salvos.":"Produto salvo na sua conta.");});
  $("#addedToCartClose")?.addEventListener("click",closeAddedToCartModal);
  $("#addedContinueShopping")?.addEventListener("click",closeAddedToCartModal);
  $("#addedGoCart")?.addEventListener("click",()=>{closeAddedToCartModal();closeProductPage();openCartPage();});
  $("#addedRelatedPrev")?.addEventListener("click",()=>$("#addedRelatedTrack")?.scrollBy({left:-250,behavior:"smooth"}));
  $("#addedRelatedNext")?.addEventListener("click",()=>$("#addedRelatedTrack")?.scrollBy({left:250,behavior:"smooth"}));
  $("#addedRelatedTrack")?.addEventListener("click",e=>{const add=e.target.closest("[data-added-add]"),view=e.target.closest("[data-added-view]");if(add){const id=add.dataset.addedAdd;addToCart(id);$("#productPageCartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);toast("Produto relacionado adicionado ao carrinho.");}if(view){closeAddedToCartModal();openProduct(view.dataset.addedView);}});
  $("#addedToCartModal")?.addEventListener("click",e=>{if(e.target===e.currentTarget)closeAddedToCartModal();});
  $("#productReviewJump")?.addEventListener("click",()=>$("#productReviews")?.scrollIntoView({behavior:"smooth",block:"start"}));
  $$("[data-product-tab]").forEach(btn=>btn.addEventListener("click",()=>{const tab=btn.dataset.productTab;$$('[data-product-tab]').forEach(x=>x.classList.toggle("active",x===btn));$$('[data-product-panel]').forEach(x=>x.classList.toggle("active",x.dataset.productPanel===tab));}));
  const reviewPhotos=$("#reviewPhotos"),reviewPreview=$("#reviewPhotoPreview");
  reviewPhotos?.addEventListener("change",()=>{const files=[...reviewPhotos.files].slice(0,4);if([...reviewPhotos.files].length>4)toast("Você pode enviar até 4 fotos.");const valid=files.filter(f=>f.type.startsWith("image/")&&f.size<=5*1024*1024);if(valid.length<files.length)toast("Use imagens de até 5 MB cada.");if(reviewPreview)reviewPreview.innerHTML=valid.map(f=>`<img src="${URL.createObjectURL(f)}" alt="Prévia da foto da avaliação">`).join("");});
  $("#productReviewForm")?.addEventListener("submit",async e=>{e.preventDefault();if(!productPageActive)return;const comment=$("#reviewComment").value.trim();if(comment.length<8){toast("Escreva um comentário um pouco mais completo.");return;}const files=[...(reviewPhotos?.files||[])].filter(f=>f.type.startsWith("image/")&&f.size<=5*1024*1024).slice(0,4);const images=await Promise.all(files.map(f=>new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(f)})));const reviews=getReviews(productPageActive.id);reviews.push({name:currentProfile?.name||currentUser?.user_metadata?.name||"Cliente Relpps",rating:Number($("#reviewRating").value)||5,comment,images,date:new Date().toLocaleDateString("pt-BR")});saveReviews(productPageActive.id,reviews);$("#reviewComment").value="";if(reviewPhotos)reviewPhotos.value="";if(reviewPreview)reviewPreview.innerHTML="";renderProductReviews();toast("Obrigado! Sua avaliação foi publicada neste navegador.");});
}
initProductPage();

// Políticas legais e suporte
$("#footerPolicyLink")?.addEventListener("click",e=>{e.preventDefault();$("#policyModal")?.classList.remove("hidden");document.body.style.overflow="hidden";});
$("[data-close=\"policyModal\"]")?.addEventListener("click",()=>{$("#policyModal")?.classList.add("hidden");document.body.style.overflow="";});
$("#policyModal")?.addEventListener("click",e=>{if(e.target===e.currentTarget){e.currentTarget.classList.add("hidden");document.body.style.overflow="";}});

async function handleCheckoutReturn(){
  const params=new URLSearchParams(location.search);
  const mode=params.get("checkout");
  if(mode!=="return" && mode!=="infinitepay-return") return;
  const id=params.get("order");
  if(!id) return;
  try{
    if(mode==="infinitepay-return" && params.get("transaction_nsu") && params.get("slug")){
      try{
        await fetch(`/.netlify/functions/checkout?action=infinitepay-return&order=${encodeURIComponent(id)}&transaction_nsu=${encodeURIComponent(params.get("transaction_nsu"))}&slug=${encodeURIComponent(params.get("slug"))}`,{cache:"no-store"});
      }catch{}
    }
    // O webhook normalmente já atualizou o pedido. Damos alguns segundos para
    // a confirmação chegar antes de exibir o status final ao cliente.
    let order=await getCheckoutOrderStatus(id);
    for(let i=0;i<4 && order.paymentStatus!=="APPROVED" && order.paymentStatus!=="FAILED";i++){
      await new Promise(r=>setTimeout(r,1200));
      order=await getCheckoutOrderStatus(id);
    }
    lastCreatedOrder={id:order.id,status:order.status,paymentStatus:order.paymentStatus,delivery:order.delivery,totals:order.totals};
    if(order.paymentStatus==="APPROVED" || order.paymentStatus==="FAILED" || order.paymentStatus==="AWAITING_PAYMENT") {
      const q=new URLSearchParams({order:order.id});
      if(params.get("transaction_nsu")) q.set("transaction_nsu",params.get("transaction_nsu"));
      if(params.get("slug")) q.set("slug",params.get("slug"));
      if(params.get("capture_method")) q.set("capture_method",params.get("capture_method"));
      if(params.get("receipt_url")) q.set("receipt_url",params.get("receipt_url"));
      window.location.href=`pedido.html?${q.toString()}`; return; }
    const fakeData={name:currentProfile?.name||currentUser?.user_metadata?.name||"Cliente",payment:order.paymentStatus==="APPROVED"?"card":"card"};
    showPaymentResult(lastCreatedOrder,fakeData);
    if(order.paymentStatus==="APPROVED") toast("Pagamento confirmado. Pedido liberado.");
    else if(order.paymentStatus==="FAILED") toast("O pagamento não foi aprovado. Você pode tentar novamente.");
    history.replaceState(null,"",location.pathname+location.hash);
  }catch(e){ console.error(e); }
}
handleCheckoutReturn();


// ===== Club Relpps: conta dedicada, jornada premium e cupom no pagamento =====
(function initMinhaRelppsPremium(){
  $("#minhaRelppsBack")?.addEventListener("click",async()=>{pendingCheckout=false;await closeMinhaRelppsPage();});
  $("#minhaRelppsLogout")?.addEventListener("click",logoutAccount);
  $("#minhaRelppsUseData")?.addEventListener("click",async()=>{
    checkoutUseSavedData=true;
    const goCheckout=pendingCheckout===true;
    if(goCheckout){ pendingCheckout=false; await closeMinhaRelppsPage(); await openCheckout(); toast("Seus dados foram preparados para facilitar sua compra."); }
    else { await closeMinhaRelppsPage(); toast("Seus dados estão prontos para facilitar sua próxima compra."); }
  });
  $("#minhaRelppsRewards")?.addEventListener("click",e=>{const b=e.target.closest(".club-reward-card");if(!b||b.disabled)return;redeemLoyaltyReward(Number(b.dataset.rewardPoints),Number(b.dataset.rewardValue));renderMinhaRelppsPage();});

  $("#clubSuggestAll")?.addEventListener("click",async()=>{pendingCheckout=false;await closeMinhaRelppsPage();location.hash="produtos";setTimeout(()=>document.querySelector("#produtos")?.scrollIntoView({behavior:"smooth",block:"start"}),40);});
  $$("[data-club-catalog]").forEach(btn=>btn.addEventListener("click",async()=>{const area=btn.dataset.clubCatalog||"";pendingCheckout=false;await closeMinhaRelppsPage();selectCatalogPath(area,"",true);}));
  $("#applyCheckoutCoupon")?.addEventListener("click",applyCheckoutCoupon);
  $("#checkoutCouponCode")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();applyCheckoutCoupon();}});
})();
