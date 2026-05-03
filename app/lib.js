const HelmLib=(function(){

  function flatten(obj,prefix,out){
    if(obj===null||obj===undefined){out.push({path:prefix,val:null,type:'null'});return;}
    if(Array.isArray(obj)){
      if(!obj.length){out.push({path:prefix,val:'[]',type:'arr'});return;}
      obj.forEach((v,i)=>flatten(v,prefix+'['+i+']',out));return;
    }
    if(typeof obj==='object'){
      const keys=Object.keys(obj);
      if(!keys.length){out.push({path:prefix,val:'{}',type:'arr'});return;}
      keys.forEach(k=>flatten(obj[k],prefix?prefix+'.'+k:k,out));return;
    }
    let type='str';
    if(typeof obj==='number')type='num';
    else if(typeof obj==='boolean')type='bool';
    out.push({path:prefix,val:String(obj),type});
  }

  function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function highlight(text,query){
    if(!query)return esc(text);
    const lower=String(text).toLowerCase(),q=query.toLowerCase();
    let result='',i=0;
    while(i<lower.length){
      const idx=lower.indexOf(q,i);
      if(idx===-1){result+=esc(text.slice(i));break;}
      result+=esc(text.slice(i,idx))+'<span class="hl">'+esc(text.slice(idx,idx+q.length))+'</span>';
      i=idx+q.length;
    }
    return result;
  }

  function displayName(key){const i=key.indexOf('|');return i>=0?key.slice(i+1):key;}

  function dirOf(p){return p.includes('/')?p.substring(0,p.lastIndexOf('/')):''}

  function buildChartTree(fileMap,parseYaml,rootFallback){
    if(rootFallback===undefined)rootFallback='chart';

    const chartYamls=Object.keys(fileMap).filter(p=>p.toLowerCase().endsWith('/chart.yaml')||p.toLowerCase()==='chart.yaml');
    if(!chartYamls.length) throw new Error('No Chart.yaml found');
    chartYamls.sort((a,b)=>a.split('/').length-b.split('/').length);
    const rootChartYaml=chartYamls[0];

    const rootMeta=parseYaml(fileMap[rootChartYaml])||{};
    const rootName=rootMeta.name||rootFallback;

    const tempData={};
    const tempEntries={};

    function discoverChart(chartYamlPath,parent,nameHint){
      const dir=dirOf(chartYamlPath);
      const content=fileMap[chartYamlPath];
      if(!content)return;
      const meta=parseYaml(content)||{};
      const name=meta.name||nameHint||dir.split('/').pop()||'unknown';

      const valuesPath=dir?dir+'/values.yaml':'values.yaml';
      const valuesContent=fileMap[valuesPath];

      const entry={name,version:meta.version||'',description:meta.description||'',dependencies:[]};
      if(parent)entry.parent=parent;

      if(valuesContent){
        try{tempData[name]=parseYaml(valuesContent)||{};}catch(e){}
        entry.values_file=name+'.yaml';
      }

      tempEntries[name]=entry;

      const deps=meta.dependencies||[];
      if(Array.isArray(deps)){
        for(const d of deps){
          if(d&&typeof d==='object'&&d.name) entry.dependencies.push(d.alias||d.name);
        }
      }

      const chartsSubdir=dir?dir+'/charts':'charts';
      const subChartYamls=chartYamls.filter(p=>{
        if(p===chartYamlPath)return false;
        const pDir=dirOf(p);
        const rel=pDir.substring(chartsSubdir.length+1);
        return pDir.startsWith(chartsSubdir)&&!rel.includes('/');
      });
      for(const subPath of subChartYamls){
        const subName=discoverChart(subPath,name);
        if(subName&&!entry.dependencies.includes(subName)) entry.dependencies.push(subName);
      }
      return name;
    }

    discoverChart(rootChartYaml,null,rootName);

    // Namespace subchart keys as "root|subname" to avoid collisions across trees
    const nsEntries={},nsData={};
    const r=rootName;
    for(const[n,e] of Object.entries(tempEntries)){
      const k=n===r?n:r+'|'+n;
      nsEntries[k]=e;
    }
    for(const[n,v] of Object.entries(tempData)){
      const k=n===r?n:r+'|'+n;
      nsData[k]=v;
    }
    for(const e of Object.values(nsEntries)){
      e.dependencies=e.dependencies.map(d=>d in tempEntries?(d===r?d:r+'|'+d):d);
    }

    return {root:r,entries:nsEntries,data:nsData};
  }

  // Set value at dot-path in object (mutates obj)
  function setNestedPath(obj, path, value) {
    const keys = path.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur == null || typeof cur !== 'object') return;
      if (cur[keys[i]] == null) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    if (cur != null && typeof cur === 'object') {
      cur[keys[keys.length - 1]] = value;
    }
  }

  // Coerce string input to match original value type
  function coerceValue(str, original) {
    const s = str.trim();
    if ((s.startsWith("'") && s.endsWith("'") && s.length >= 2) ||
        (s.startsWith('"') && s.endsWith('"') && s.length >= 2)) return s.slice(1, -1);
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null') return null;
    if (typeof original === 'number') { const n = Number(s); return isNaN(n) ? s : n; }
    return s;
  }

  // Get value at dot-path in object (read-only, returns undefined if missing)
  function getNestedVal(obj, dotPath) {
    const keys = dotPath.split('.');
    let cur = obj;
    for (const k of keys) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[k];
    }
    return cur;
  }

  // Compare original vs current value for change detection
  // origVal is raw JS value; currentVal is raw JS value
  function valChanged(origVal, currentVal) {
    return String(origVal === null ? 'null' : origVal) !== String(currentVal === null ? 'null' : currentVal);
  }

  return {flatten,esc,highlight,displayName,dirOf,buildChartTree,setNestedPath,coerceValue,getNestedVal,valChanged};
})();
if(typeof module!=='undefined') module.exports=HelmLib;
