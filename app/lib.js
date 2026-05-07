const HelmLib=(function(){

  // Bracket-aware path parser.
  // Handles [n] (array index) and ["key"] (dotted YAML key with literal dot in name).
  // Returns array of string segments; numeric array indices are returned as strings.
  // Examples:
  //   'a.b.c'                              → ['a','b','c']
  //   'arr[0]'                             → ['arr','0']
  //   'annotations["argocd.io/opt"]'       → ['annotations','argocd.io/opt']
  //   'a["x.y"][0].b'                      → ['a','x.y','0','b']
  function parsePath(path){
    const segs=[];
    let i=0;
    while(i<path.length){
      if(path[i]==='.'){i++;continue;}
      if(path[i]==='['){
        const close=path.indexOf(']',i+1);
        if(close===-1)break;
        const inner=path.slice(i+1,close);
        if(inner.length>=2&&inner[0]==='"'&&inner[inner.length-1]==='"'){
          segs.push(inner.slice(1,-1).replace(/\\"/g,'"').replace(/\\\\/g,'\\'));
        }else{
          segs.push(inner);
        }
        i=close+1;
      }else{
        let end=i;
        while(end<path.length&&path[end]!=='.'&&path[end]!=='[')end++;
        segs.push(path.slice(i,end));
        i=end;
      }
    }
    return segs;
  }

  // Bracket-aware parent path finder.
  // Returns the path with the last segment removed, or null if already top-level.
  // Dots inside ["..."] are NOT treated as separators.
  // Examples:
  //   'a.b.c'                         → 'a.b'
  //   'arr[0]'                        → 'arr'
  //   'annotations["argocd.io/opt"]'  → 'annotations'
  //   'top'                           → null
  function parentPathOf(path){
    let inBracket=false;
    for(let i=path.length-1;i>=0;i--){
      if(path[i]===']')inBracket=true;
      else if(path[i]==='['){const p=path.slice(0,i);return p||null;}
      else if(path[i]==='.'&&!inBracket){return path.slice(0,i);}
    }
    return null;
  }

  function flatten(obj,prefix,out){
    if(obj===null||obj===undefined){out.push({path:prefix,val:null,type:'null'});return;}
    if(Array.isArray(obj)){
      if(!obj.length){out.push({path:prefix,val:'[]',type:'arr'});return;}
      obj.forEach((v,i)=>flatten(v,prefix+'['+i+']',out));return;
    }
    if(typeof obj==='object'){
      const keys=Object.keys(obj);
      if(!keys.length){out.push({path:prefix,val:'{}',type:'arr'});return;}
      keys.forEach(k=>{
        // Keys that contain '.', '[', ']', or '"' must use ["key"] bracket notation
        // to avoid ambiguity with nested-object dot paths.
        const needsQuote=k.includes('.')||k.includes('[')||k.includes(']')||k.includes('"');
        let childPath;
        if(needsQuote){
          const escaped=k.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
          childPath=prefix?prefix+'["'+escaped+'"]':'["'+escaped+'"]';
        }else{
          childPath=prefix?prefix+'.'+k:k;
        }
        flatten(obj[k],childPath,out);
      });
      return;
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

  // Set value at path in object (mutates obj).
  // Uses parsePath for bracket-aware segment splitting — handles both [n] array
  // indices and ["key"] dotted YAML keys.
  function setNestedPath(obj, path, value) {
    const segs = parsePath(path);
    if (!segs.length) return;
    let cur = obj;
    for (let i = 0; i < segs.length - 1; i++) {
      if (cur == null || typeof cur !== 'object') return;
      const seg = segs[i];
      const nextSeg = segs[i + 1];
      // Remove stale "name[n]" literal keys written by old code without bracket support
      if (/^\d+$/.test(nextSeg)) delete cur[seg + '[' + nextSeg + ']'];
      // Remove dotted-key shortcuts that collide with the nested path, but only when
      // all remaining segments are simple identifiers (no dots/brackets in them).
      const remainingSegs = segs.slice(i);
      if (remainingSegs.every(s => !s.includes('.') && !s.includes('[') && !s.includes(']'))) {
        delete cur[remainingSegs.join('.')];
      }
      if (cur[seg] == null) cur[seg] = {};
      cur = cur[seg];
    }
    if (cur != null && typeof cur === 'object') cur[segs[segs.length - 1]] = value;
  }

  // Remove stale "key[n]" literal keys written by old code without bracket support.
  // Mutates obj in place. Safe to call on any YAML-loaded object.
  function cleanStaleBracketKeys(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(cleanStaleBracketKeys); return; }
    for (const key of Object.keys(obj)) {
      const m = key.match(/^(.+)\[(\d+)\]$/);
      if (m && Array.isArray(obj[m[1]])) {
        delete obj[key]; // stale literal bracket key; real data lives in the array
      } else {
        cleanStaleBracketKeys(obj[key]);
      }
    }
  }

  // Remove dotted-key shortcuts that conflict with properly nested structures.
  // e.g. if obj has both "statusbadge.enabled": false AND statusbadge: {enabled: x},
  // the dotted key is a leftover from old code — delete it so only the nested value remains.
  // Note: legitimate dotted YAML keys (e.g. "argocd.argoproj.io/sync-options") are NOT
  // deleted because their nested-path traversal will fail (intermediate keys won't exist).
  function cleanDottedKeyCollisions(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(cleanDottedKeyCollisions); return; }
    for (const key of Object.keys(obj)) {
      if (key.includes('.')) {
        // key like "statusbadge.enabled" — check if the nested path also exists
        const parts = key.split('.');
        let cur = obj;
        let nested = true;
        for (const p of parts) { if (cur == null || typeof cur !== 'object' || !(p in cur)) { nested = false; break; } cur = cur[p]; }
        if (nested) delete obj[key]; // nested path exists — dotted key is stale collision
      } else {
        cleanDottedKeyCollisions(obj[key]);
      }
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

  // Get value at path in object (read-only, returns undefined if missing).
  // Uses parsePath for bracket-aware segment splitting.
  function getNestedVal(obj, dotPath) {
    const segs = parsePath(dotPath);
    let cur = obj;
    for (const k of segs) {
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

  return {flatten,esc,highlight,displayName,dirOf,buildChartTree,setNestedPath,coerceValue,getNestedVal,valChanged,cleanStaleBracketKeys,cleanDottedKeyCollisions,parsePath,parentPathOf};
})();
if(typeof module!=='undefined') module.exports=HelmLib;
