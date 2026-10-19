import { catalogCsv, catalogRows, type CatalogSort, type CatalogOrder } from '../lib/catalog';

type Entity = { id:string; name:string; url:string; summary:string; sector:string; chains:string[]; stage:string; roles:string[]; capabilities:string[]; evidence:{label:string;url:string;publisher:string;date?:string}[]; reviewedAt:string };
type Metric = { id:string; label:string; value:number|null; unit:string; sourceUrl:string; asOf:string; scope:string; note?:string };
type Point = { date:string; value:number };
type Payload = { kind:'agents'|'finance'; title:string; entities:Entity[]; sectors:{id:string;label:string}[]; snapshot:{asOf:string; observedAt:string; metrics:Metric[];series:Record<string,Point[]>;seriesMeta?:Record<string,Pick<Metric,'label'|'unit'|'sourceUrl'|'scope'|'note'>>} };

const format = (value:number,unit='USD') => `${unit.toUpperCase().includes('USD')?'$':''}${new Intl.NumberFormat('en-US',{notation:Math.abs(value)>=1e6?'compact':'standard',maximumFractionDigits:Math.abs(value)>=1e6?2:0}).format(value)}`;
const dateOnly = (value:string) => { const d = new Date(value); return Number.isNaN(d.getTime())?value:d.toISOString().slice(0,10); };
const make = <K extends keyof HTMLElementTagNameMap>(tag:K,text?:string) => {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};

export function mountLandscape() {
  document.querySelectorAll<HTMLElement>('[data-landscape]').forEach(root=>{
    if(root.dataset.mounted)return;
    root.dataset.mounted='true';
    const raw=root.querySelector('[data-landscape-payload]')?.textContent;
    if(!raw)return;
    let payload:Payload;
    try { payload=JSON.parse(raw) as Payload; }
    catch { root.querySelector<HTMLElement>('[data-landscape-status]')!.textContent='交互数据暂不可用；可继续阅读正文与项目资料，或下载原始数据。';return; }
    const {entities,sectors,snapshot}=payload;
    const byId=new Map(entities.map(entity=>[entity.id,entity]));
    const query=new URLSearchParams(location.search);
    const status=root.querySelector<HTMLElement>('[data-landscape-status]')!;
    const inputs=Object.fromEntries([...root.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-filter]')].map(input=>[input.dataset.filter!,input]));
    const filters={q:(query.get('q')||'').slice(0,150),sector:query.get('sector')||'all',chain:query.get('chain')||'all',stage:query.get('stage')||'all'};
    const selected=new Set((query.get('compare')||'').split(',').filter(id=>byId.has(id)).slice(0,3));
    const sectorNames=new Map(sectors.map(sector=>[sector.id,sector.label]));
    const rowNodes=new Map([...root.querySelectorAll<HTMLElement>('[data-entity]')].map(row=>[row.dataset.entity!,row]));
    const tableBody=root.querySelector<HTMLElement>('[data-project-grid]')!;
    let sort:CatalogSort=['name','sector','sources','reviewed'].includes(query.get('sort')||'') ? query.get('sort') as CatalogSort : 'name';
    let order:CatalogOrder=query.get('order')==='desc'?'desc':'asc';
    let shown=50;
    let matching:Entity[]=[];
    for(const [key,input] of Object.entries(inputs)){
      input.value=filters[key as keyof typeof filters];
      if(input instanceof HTMLSelectElement && !input.value){input.value='all';filters[key as keyof typeof filters]='all';}
    }
    const requestedSnapshot=query.get('snapshot');
    if(requestedSnapshot && requestedSnapshot!==dateOnly(snapshot.asOf))status.textContent=`该链接请求 ${requestedSnapshot} 快照；本地当前可用数据为 ${dateOnly(snapshot.asOf)}，以下展示当前快照。`;
    function updateUrl(){
      const url=new URL(location.href);
      for(const [key,value] of Object.entries(filters)){if(value&&value!=='all')url.searchParams.set(key,value);else url.searchParams.delete(key);}
      if(selected.size)url.searchParams.set('compare',[...selected].join(','));else url.searchParams.delete('compare');
      if(sort!=='name'||order!=='asc'){url.searchParams.set('sort',sort);url.searchParams.set('order',order);}else{url.searchParams.delete('sort');url.searchParams.delete('order');}
      url.searchParams.set('snapshot',dateOnly(snapshot.asOf));
      history.replaceState(null,'',url);
    }
    function applyFilters(){
      matching=catalogRows(entities,filters,sort,order,sectorNames);
      rowNodes.forEach(row=>row.hidden=true);
      matching.forEach((entity,index)=>{
        const row=rowNodes.get(entity.id)!;
        row.hidden=index>=shown;
        row.querySelector<HTMLElement>('[data-row-number]')!.textContent=String(index+1);
        tableBody.append(row);
      });
      const matched=matching.length;
      root.querySelector<HTMLElement>('[data-result-count]')!.textContent=`${matched} 个匹配项目 · 已显示 ${Math.min(shown,matched)} 个`;
      root.querySelector<HTMLElement>('[data-filter-empty]')!.hidden=matched>0;
      const more=root.querySelector<HTMLButtonElement>('[data-show-more]')!;
      more.hidden=matched<=shown;more.textContent=`显示更多项目（剩余 ${Math.max(0,matched-shown)}）`;
      root.querySelectorAll<HTMLElement>('[data-sector-jump]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sectorJump===filters.sector)));
      root.querySelectorAll<HTMLElement>('[data-sort]').forEach(button=>{
        const header=button.closest('th');
        header?.setAttribute('aria-sort','none');
        if(header?.dataset.sortLabel)header.setAttribute('aria-label',header.dataset.sortLabel);
      });
      root.querySelectorAll<HTMLElement>('[data-sort]').forEach(button=>{
        const active=button.dataset.sort===sort;
        button.setAttribute('aria-pressed',String(active));
        if(active){
          const header=button.closest('th');
          header?.setAttribute('aria-sort',order==='asc'?'ascending':'descending');
          if(header?.dataset.sortLabel)header.setAttribute('aria-label',`证据，按${sort==='sources'?'来源数量':'核验日期'}排序`);
        }
        button.querySelector<HTMLElement>('[data-sort-indicator]')!.textContent=active?(order==='asc'?'↑':'↓'):'↕';
      });
      root.querySelector<HTMLButtonElement>('[data-catalog-export]')!.disabled=matched===0;
      updateUrl();
    }
    Object.entries(inputs).forEach(([key,input])=>input.addEventListener(input instanceof HTMLInputElement?'input':'change',()=>{filters[key as keyof typeof filters]=input.value.slice(0,150);shown=50;applyFilters();}));
    root.querySelectorAll('[data-filter-reset]').forEach(button=>button.addEventListener('click',()=>{Object.assign(filters,{q:'',sector:'all',chain:'all',stage:'all'});for(const[key,input]of Object.entries(inputs))input.value=filters[key as keyof typeof filters];sort='name';order='asc';shown=50;status.textContent='';applyFilters();}));
    root.querySelector('[data-show-more]')!.addEventListener('click',()=>{shown+=50;applyFilters();});
    root.querySelectorAll<HTMLElement>('[data-sector-jump]').forEach(button=>button.addEventListener('click',()=>{filters.sector=filters.sector===button.dataset.sectorJump?'all':button.dataset.sectorJump!;inputs.sector.value=filters.sector;shown=50;applyFilters();}));
    root.querySelectorAll<HTMLElement>('[data-sort]').forEach(button=>button.addEventListener('click',()=>{
      const next=button.dataset.sort as CatalogSort;
      order=sort===next?(order==='asc'?'desc':'asc'):(next==='sources'||next==='reviewed'?'desc':'asc');
      sort=next;applyFilters();
      status.textContent=`已按${{name:'项目名称',sector:'板块',sources:'来源数量',reviewed:'核验日期'}[sort]}${order==='asc'?'升':'降'}序排列。`;
    }));
    root.querySelector('[data-catalog-export]')!.addEventListener('click',()=>{
      if(!matching.length)return;
      const url=URL.createObjectURL(new Blob([catalogCsv(matching,sectorNames)],{type:'text/csv;charset=utf-8'}));
      const a=make('a');a.href=url;a.download=`jvyin-${payload.kind}-catalog-${dateOnly(snapshot.asOf)}.csv`;a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      status.textContent=`已导出 ${matching.length} 个匹配项目，包含原始来源与核验日期。`;
    });

    const entityDialog=root.querySelector<HTMLDialogElement>('[data-entity-dialog]')!;
    const compareDialog=root.querySelector<HTMLDialogElement>('[data-compare-dialog]')!;
    let previousFocus:HTMLElement|null=null;
    const previousOverflow=document.body.style.overflow;
    function openDialog(dialog:HTMLDialogElement){previousFocus=document.activeElement as HTMLElement;dialog.showModal();document.body.style.overflow='hidden';dialog.scrollTop=0;dialog.querySelector<HTMLButtonElement>('[data-dialog-close]')?.focus();}
    [entityDialog,compareDialog].forEach(dialog=>{
      dialog.querySelector('[data-dialog-close]')!.addEventListener('click',()=>dialog.close());
      dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;previousFocus?.focus({preventScroll:true});});
      dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
    });
    root.querySelectorAll<HTMLElement>('[data-entity-open]').forEach(button=>button.addEventListener('click',()=>{
      const id=button.dataset.entityOpen;
      const template=[...root.querySelectorAll<HTMLTemplateElement>('[data-entity-template]')].find(t=>t.dataset.entityTemplate===id);
      if(!template)return;
      root.querySelector('[data-entity-content]')!.replaceChildren(template.content.cloneNode(true));openDialog(entityDialog);
    }));
    function syncCompare(){
      root.querySelectorAll<HTMLInputElement>('[data-compare]').forEach(input=>{input.checked=selected.has(input.value);});
      root.querySelector<HTMLElement>('[data-compare-tray]')!.hidden=selected.size===0;
      root.querySelector<HTMLElement>('[data-compare-label]')!.textContent=`已选 ${selected.size} / 3 项`;
      updateUrl();
    }
    root.querySelectorAll<HTMLInputElement>('[data-compare]').forEach(input=>input.addEventListener('change',()=>{if(input.checked&&selected.size>=3){input.checked=false;status.textContent='最多同时对比 3 个项目，请先移除一个。';return;}if(input.checked)selected.add(input.value);else selected.delete(input.value);status.textContent='';syncCompare();}));
    root.querySelector('[data-compare-clear]')!.addEventListener('click',()=>{selected.clear();syncCompare();status.textContent='';});
    root.querySelector('[data-compare-open]')!.addEventListener('click',()=>{
      const list=[...selected].map(id=>byId.get(id)!);
      if(!list.length)return;
      const table=make('table');const head=make('thead');const headRow=make('tr');
      ['比较维度',...list.map(entity=>entity.name)].forEach(label=>{const th=make('th',label);th.scope='col';headRow.append(th);});head.append(headRow);table.append(head);
      const tbody=make('tbody');
      const rows:[string,(e:Entity)=>string[]][]=[['主要角色',e=>e.roles],['披露能力',e=>e.capabilities],['环境 / 网络',e=>e.chains],['阶段',e=>[({active:'已发布',announced:'已公告',proposed:'提案'} as Record<string,string>)[e.stage] || e.stage]],['核验日期',e=>[dateOnly(e.reviewedAt)]]];
      for(const[label,read]of rows){const tr=make('tr');const th=make('th',label);th.scope='row';tr.append(th);list.forEach(entity=>{const td=make('td');const ul=make('ul');read(entity).forEach(value=>ul.append(make('li',value)));td.append(ul);tr.append(td);});tbody.append(tr);}
      const tr=make('tr');const sourceHeading=make('th','原始来源');sourceHeading.scope='row';tr.append(sourceHeading);list.forEach(entity=>{const td=make('td');entity.evidence.forEach(source=>{const p=make('p');const a=make('a',`${source.label} ↗`);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';p.append(a);td.append(p);});tr.append(td);});tbody.append(tr);table.append(tbody);
      root.querySelector('[data-compare-content]')!.replaceChildren(table);openDialog(compareDialog);
    });
    const feedFilter=root.querySelector<HTMLSelectElement>('[data-feed-filter]')!;
    const viewParam=(key:string,value:string)=>{const url=new URL(location.href);const defaults:Record<string,string>={feed:'all',publisher:'all',capability:'execution',asset:'rwa'};if(value===defaults[key])url.searchParams.delete(key);else url.searchParams.set(key,value);history.replaceState(null,'',url);};
    let feedLimit = payload.kind === 'agents' ? 6 : Infinity;
    const feedMore = root.querySelector<HTMLButtonElement>('[data-feed-more]');
    const publisherFilter = root.querySelector<HTMLSelectElement>('[data-feed-publisher]');
    if(publisherFilter && [...publisherFilter.options].some(option=>option.value===query.get('publisher'))) publisherFilter.value=query.get('publisher')!;
    const applyFeed=()=>{let count=0;root.querySelectorAll<HTMLElement>('[data-feed-kind]').forEach(item=>{const matches=(feedFilter.value==='all'||item.dataset.feedKind===feedFilter.value)&&(!publisherFilter||publisherFilter.value==='all'||item.dataset.feedPublisherItem===publisherFilter.value);item.hidden=!matches||count>=feedLimit;if(matches)count++;});root.querySelector<HTMLElement>('[data-feed-empty]')!.hidden=count>0;if(feedMore)feedMore.hidden=count<=feedLimit;viewParam('feed',feedFilter.value);if(publisherFilter)viewParam('publisher',publisherFilter.value);};
    if(['release','research','report'].includes(query.get('feed')||'')){feedFilter.value=query.get('feed')!;applyFeed();}
    applyFeed();
    feedFilter.addEventListener('change',()=>{feedLimit=payload.kind==='agents'?6:Infinity;applyFeed();});
    feedMore?.addEventListener('click',()=>{feedLimit+=6;applyFeed();});
    publisherFilter?.addEventListener('change',()=>{feedLimit=6;applyFeed();});
    const platformTabs=root.querySelectorAll<HTMLElement>('[data-platform-tab]');
    const applyPlatform=(value:string)=>{platformTabs.forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.platformTab===value)));root.querySelectorAll<HTMLElement>('[data-platform-content]').forEach(content=>content.hidden=content.dataset.platformContent!==value);viewParam('capability',value);};
    platformTabs.forEach(button=>button.addEventListener('click',()=>applyPlatform(button.dataset.platformTab!)));
    if(platformTabs.length&&['execution','authorization','payments'].includes(query.get('capability')||''))applyPlatform(query.get('capability')!);
    const assetTabs=root.querySelectorAll<HTMLElement>('[data-asset-tab]');
    const applyAsset=(value:string)=>{assetTabs.forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.assetTab===value)));root.querySelectorAll<HTMLElement>('[data-asset-view]').forEach(view=>view.hidden=view.dataset.assetView!==value);viewParam('asset',value);};
    assetTabs.forEach(button=>button.addEventListener('click',()=>applyAsset(button.dataset.assetTab!)));
    if(assetTabs.length&&['rwa','stablecoins'].includes(query.get('asset')||''))applyAsset(query.get('asset')!);

    const chartContainer=root.querySelector<HTMLElement>('[data-chart]');
    if(chartContainer){
      const select=root.querySelector<HTMLSelectElement>('[data-chart-series]')!;
      const cursor=root.querySelector<HTMLInputElement>('[data-chart-cursor]')!;
      const readout=root.querySelector<HTMLElement>('[data-chart-readout]')!;
      const source=root.querySelector<HTMLElement>('[data-chart-source]')!;
      let range=['30','90','all'].includes(query.get('range')||'')?query.get('range')!:'90';
      let points:Point[]=[];let chartSvg:SVGSVGElement|null=null;let activeMetric:Metric|undefined;
      let chartWidth=680;
      const left=48;
      const plotWidth=()=>chartWidth-left-12;
      let marker:SVGLineElement|null=null;let dot:SVGCircleElement|null=null;
      let yScale=(value:number)=>value;
      const ns='http://www.w3.org/2000/svg';
      const svgNode=<K extends keyof SVGElementTagNameMap>(name:K,attrs:Record<string,string|number>={},text?:string)=>{const el=document.createElementNS(ns,name);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));if(text!==undefined)el.textContent=text;return el;};
      if(query.get('metric')&&Object.keys(snapshot.series).includes(query.get('metric')!))select.value=query.get('metric')!;
      function chartUrl(){const url=new URL(location.href);url.searchParams.set('metric',select.value);url.searchParams.set('range',range);history.replaceState(null,'',url);}
      function pick(index:number){
        index=Math.max(0,Math.min(points.length-1,index));const point=points[index];if(!point)return;
        const x=left+index/Math.max(1,points.length-1)*plotWidth();
        marker?.setAttribute('x1',String(x));marker?.setAttribute('x2',String(x));
        dot?.setAttribute('cx',String(x));dot?.setAttribute('cy',String(yScale(point.value)));
        readout.replaceChildren(document.createTextNode(dateOnly(point.date)),make('b',format(point.value,activeMetric?.unit)));
        cursor.value=String(index);
      }
      function drawChart(){
        chartWidth=chartContainer!.clientWidth || 680;
        const id=select.value;
        const meta=snapshot.seriesMeta?.[id];
        activeMetric=meta ? {id,value:null,asOf:snapshot.asOf,...meta} : snapshot.metrics.find(metric=>metric.id===id);
        const all=(snapshot.series[id]||[]).filter(p=>Number.isFinite(p.value)&&!Number.isNaN(new Date(p.date).getTime())).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
        const cutoff=all.length&&range!=='all'?new Date(all.at(-1)!.date).getTime()-(Number(range)-1)*86400000:-Infinity;
        points=all.filter(point=>new Date(point.date).getTime()>=cutoff);
        root.querySelectorAll<HTMLElement>('[data-chart-range]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.chartRange===range)));
        const exportButton=root.querySelector<HTMLButtonElement>('[data-chart-export]')!;
        exportButton.disabled=points.length<2;
        if(points.length<2){chartSvg=null;marker=dot=null;source.textContent='';chartContainer!.replaceChildren(make('p','该区间暂无足够历史观测，选择更长时间范围。'));cursor.disabled=true;readout.textContent='';chartUrl();return;}
        cursor.disabled=false;cursor.max=String(points.length-1);
        let min=Math.min(...points.map(p=>p.value));let max=Math.max(...points.map(p=>p.value));const pad=(max-min)*.12||Math.max(1,Math.abs(max)*.02);min=min<0?min-pad:Math.max(0,min-pad);max+=pad;
        yScale=value=>190-(value-min)/(max-min)*165;
        chartSvg=svgNode('svg',{viewBox:`0 0 ${chartWidth} 225`,role:'img','aria-label':`${activeMetric?.label||select.selectedOptions[0]?.textContent}，${dateOnly(points[0].date)} 至 ${dateOnly(points.at(-1)!.date)}；使用下方日期滑块查看数值。`});
        const title=svgNode('title',{},`${activeMetric?.label||id}历史数据`);chartSvg.append(title);
        for(let tick=0;tick<4;tick++){const value=min+(max-min)*tick/3;const y=yScale(value);chartSvg.append(svgNode('line',{x1:left,y1:y,x2:chartWidth-12,y2:y,stroke:'currentColor','stroke-opacity':'.1','stroke-dasharray':'3 5'}));chartSvg.append(svgNode('text',{x:left-6,y:y+3,'text-anchor':'end',fill:'currentColor',opacity:'.6','font-size':10,'font-family':'monospace'},format(value,activeMetric?.unit)));}
        const coords=points.map((p,i)=>[left+i/(points.length-1)*plotWidth(),yScale(p.value)]);
        const line=coords.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
        const color=getComputedStyle(root).getPropertyValue('--accent').trim()||'#202020';
        chartSvg.append(svgNode('path',{d:`${line} L${chartWidth-12},190 L${left},190 Z`,fill:color,'fill-opacity':'.09'}));chartSvg.append(svgNode('path',{d:line,fill:'none',stroke:color,'stroke-width':2,'stroke-linejoin':'round','stroke-linecap':'round'}));
        [0,Math.floor((points.length-1)/2),points.length-1].forEach(i=>chartSvg!.append(svgNode('text',{x:left+i/(points.length-1)*plotWidth(),y:215,'text-anchor':i===0?'start':i===points.length-1?'end':'middle',fill:'currentColor',opacity:'.6','font-size':10,'font-family':'monospace'},dateOnly(points[i].date))));
        marker=svgNode('line',{x1:chartWidth-12,y1:20,x2:chartWidth-12,y2:190,stroke:color,'stroke-dasharray':'3 4',opacity:.6});dot=svgNode('circle',{cx:chartWidth-12,cy:0,r:4,fill:color,stroke:getComputedStyle(root).getPropertyValue('--bg').trim(),'stroke-width':2});chartSvg.append(marker,dot);
        chartSvg.addEventListener('pointermove',event=>{const rect=chartSvg!.getBoundingClientRect();const x=(event.clientX-rect.left)/rect.width*chartWidth;pick(Math.round((x-left)/plotWidth()*(points.length-1)));});
        chartContainer!.replaceChildren(chartSvg);pick(points.length-1);
        source.replaceChildren(document.createTextNode(`${activeMetric?.scope||'公开来源历史观测'} · 截至 ${dateOnly(points.at(-1)!.date)} · 纵轴按区间自动缩放 · `));
        if(activeMetric?.sourceUrl){const a=make('a','原始来源 ↗');a.href=activeMetric.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';source.append(a);}else source.append(make('span','见数据快照来源字段'));
        root.querySelectorAll<HTMLElement>('[data-chart-range]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.chartRange===range)));chartUrl();
      }
      cursor.addEventListener('input',()=>pick(Number(cursor.value)));
      select.addEventListener('change',drawChart);
      root.querySelectorAll<HTMLElement>('[data-chart-range]').forEach(button=>button.addEventListener('click',()=>{range=button.dataset.chartRange!;drawChart();}));
      root.querySelector('[data-chart-export]')!.addEventListener('click',()=>{
        if(!chartSvg)return;
        const copy=chartSvg.cloneNode(true) as SVGSVGElement;
        copy.setAttribute('viewBox',`0 -40 ${chartWidth} 350`);copy.setAttribute('width',String(chartWidth*3));copy.setAttribute('height','1050');copy.setAttribute('color','#1c1c1c');copy.setAttribute('style','color-scheme:light');
        copy.insertBefore(svgNode('rect',{x:0,y:-40,width:chartWidth,height:350,fill:'#ffffff'}),copy.firstChild);
        copy.append(svgNode('text',{x:left,y:-16,fill:'#1c1c1c','font-size':chartWidth<400?13:16,'font-family':'sans-serif'},activeMetric?.label||select.selectedOptions[0].textContent||'公开数据'));
        copy.append(svgNode('text',{x:left,y:246,fill:'#666666','font-size':9,'font-family':'sans-serif'},`${dateOnly(points[0].date)} — ${dateOnly(points.at(-1)!.date)}`));
        copy.append(svgNode('text',{x:left,y:261,fill:'#666666','font-size':8,'font-family':'sans-serif'},'纵轴按区间自动缩放 · 完整口径见 SVG 元数据'));
        const sourceHost=activeMetric?.sourceUrl ? new URL(activeMetric.sourceUrl).hostname : 'see snapshot';
        copy.append(svgNode('text',{x:left,y:278,fill:'#666666','font-size':8,'font-family':'sans-serif'},`Source: ${sourceHost}`));
        copy.append(svgNode('text',{x:left,y:294,fill:'#666666','font-size':8,'font-family':'sans-serif'},`jvyin.com/${payload.kind==='agents'?'agents':'onchain-finance'}/`));
        copy.append(svgNode('metadata',{},JSON.stringify({sourceUrl:activeMetric?.sourceUrl,scope:activeMetric?.scope,note:activeMetric?.note,snapshot:snapshot.asOf,range,view:location.search})));
        const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml;charset=utf-8'}));const a=make('a');a.href=url;a.download=`jvyin-${select.value}-${dateOnly(snapshot.asOf)}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      });
      drawChart();
      new ResizeObserver(()=>{if(Math.abs(chartContainer!.clientWidth-chartWidth)>1)drawChart();}).observe(chartContainer);
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change',drawChart);
    }
    applyFilters();syncCompare();
  });
}
