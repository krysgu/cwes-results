(async function () {
  var root = document.getElementById('cwes-full-results');
  if (!root) return;
  var response;
  var DATA;
  try {
    response = await fetch('../data/results.json');
    if (!response.ok) throw new Error('Results data could not be loaded.');
    DATA = await response.json();
  } catch (error) {
    root.innerHTML = '<div class="cwes-empty">The results archive is temporarily unavailable. Please refresh the page.</div>';
    return;
  }
  var routeSelect=root.querySelector('#cwes-route-select'),routeSearch=root.querySelector('#cwes-route-search'),personSearch=root.querySelector('#cwes-person-search');var allSummaries=DATA.summaries.slice().sort(function(a,b){return a.route_key.localeCompare(b.route_key)});
function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}function nameOf(r){return (r.first_name+' '+r.last_name).trim()}function ageGroup(value){var age=Number(value);if(value==null||value===''||!isFinite(age))return '';if(age<10)return 'Under 10';return Math.floor(age/10)*10+'s'}function selectedRoute(){return routeSelect.value}function personTerm(){return personSearch.value.trim().toLowerCase()}function baseRows(){var route=selectedRoute(),term=personTerm();return DATA.results.filter(function(r){return (!route||r.route_key===route)&&(!term||nameOf(r).toLowerCase().includes(term))})}function best(route,gender){return DATA.progression.filter(function(p){return (!route||p.route_key===route)&&p.gender===gender}).sort(function(a,b){return a.time_seconds-b.time_seconds})[0]||null}function fmtTime(s){if(s==null)return '';var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),x=Math.round(s%60);return h+':'+String(m).padStart(2,'0')+':'+String(x).padStart(2,'0')}
function fillRoutes(){var q=routeSearch.value.trim().toLowerCase(),prior=routeSelect.value;routeSelect.innerHTML='<option value="">All routes</option>';allSummaries.filter(function(s){return !q||s.route_key.toLowerCase().includes(q)}).forEach(function(s){var o=document.createElement('option');o.value=s.route_key;o.textContent=s.route_key+(s.result_count?'':' (record only)');routeSelect.appendChild(o)});if([].some.call(routeSelect.options,function(o){return o.value===prior}))routeSelect.value=prior;else if(q&&routeSelect.options.length>1)routeSelect.selectedIndex=1}
function plot(points,isFkt){
  var wrap=root.querySelector('#cwes-chart-wrap'),milestones=root.querySelector('#cwes-milestones');
  points=points.filter(function(p){return p.time_hours!=null&&p.time_hours>0});
  milestones.innerHTML='';
  if(!selectedRoute()){wrap.innerHTML='<div class="cwes-empty">Choose one route to compare elapsed times on a meaningful scale.</div>';return}
  if(!points.length){wrap.innerHTML='<div class="cwes-empty">No matching timed results are available.</div>';return}
  var years=points.map(function(p){return p.year}),minY=Math.min.apply(null,years),maxY=Math.max.apply(null,years);
  if(minY===maxY){minY--;maxY++}
  var vals=points.map(function(p){return p.time_hours}),minHour=Math.max(0,Math.floor(Math.min.apply(null,vals))),maxHour=Math.ceil(Math.max.apply(null,vals));
  if(minHour===maxHour)maxHour=minHour+1;
  var hourSpan=maxHour-minHour,W=800,L=68,R=24,T=24,B=52,H=Math.max(360,T+B+hourSpan*28);
  var x=function(year){return L+(year-minY)/(maxY-minY)*(W-L-R)},y=function(value){return T+(maxHour-value)/(maxHour-minHour)*(H-T-B)};
  var svg=['<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(isFkt?'FKT progression':'All recorded finish times')+'">'];
  for(var hour=minHour;hour<=maxHour;hour++){
    var yy=y(hour),opacity=hour%5===0?'.78':'.46';
    svg.push('<line class="axis" x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" opacity="'+opacity+'"></line><text class="axis-text" x="'+(L-8)+'" y="'+(yy+4)+'" text-anchor="end">'+hour+'h</text>');
  }
  for(var yr=Math.ceil(minY);yr<=Math.floor(maxY);yr++){
    if(maxY-minY<=10||yr%2===0){var xx=x(yr);svg.push('<line class="axis" x1="'+xx+'" y1="'+T+'" x2="'+xx+'" y2="'+(H-B)+'" opacity=".38"></line><text class="axis-text" x="'+xx+'" y="'+(H-20)+'" text-anchor="middle">'+yr+'</text>')}
  }
  [['M','m'],['F','f'],['X','x']].forEach(function(pair){
    var gp=points.filter(function(p){return p.gender===pair[0]}).sort(function(a,b){return a.year-b.year});
    if(isFkt&&gp.length){
      var d=gp.map(function(p,j){return (j?'L':'M')+x(p.year).toFixed(1)+','+y(p.time_hours).toFixed(1)}).join(' ');
      svg.push('<path class="line-'+pair[1]+'" d="'+d+'"></path>');
    }
    gp.forEach(function(p){
      var who=p.holders||nameOf(p),label=who+', '+p.year+', '+p.time;
      svg.push('<circle class="dot-'+pair[1]+'" cx="'+x(p.year).toFixed(1)+'" cy="'+y(p.time_hours).toFixed(1)+'" r="'+(isFkt?6:4.5)+'" tabindex="0" role="img" aria-label="'+esc(label)+'" data-athlete="'+esc(who)+'" data-year="'+p.year+'" data-time="'+esc(p.time)+'"><title>'+esc(label)+'</title></circle>');
    });
  });
  svg.push('<text class="axis-text" x="'+((L+W-R)/2)+'" y="'+(H-3)+'" text-anchor="middle">Year</text><text class="axis-text" transform="translate(14 '+((T+H-B)/2)+') rotate(-90)" text-anchor="middle">Elapsed time (hours)</text></svg>');
  wrap.innerHTML=svg.join('');
  var tip=document.createElement('div');tip.className='cwes-chart-tooltip';tip.hidden=true;tip.setAttribute('role','status');wrap.appendChild(tip);
  function placeTip(dot,event){
    var wrapRect=wrap.getBoundingClientRect(),left,top;
    if(event){left=event.clientX-wrapRect.left+wrap.scrollLeft+14;top=event.clientY-wrapRect.top+wrap.scrollTop+14}
    else{var dotRect=dot.getBoundingClientRect();left=dotRect.left-wrapRect.left+wrap.scrollLeft+16;top=dotRect.top-wrapRect.top+wrap.scrollTop-18}
    var maxLeft=wrap.scrollLeft+wrap.clientWidth-tip.offsetWidth-12;
    tip.style.left=Math.max(wrap.scrollLeft+8,Math.min(left,maxLeft))+'px';
    tip.style.top=Math.max(wrap.scrollTop+8,top)+'px';
  }
  function showTip(dot,event){
    tip.innerHTML='<strong>'+esc(dot.getAttribute('data-athlete'))+'</strong><span>'+esc(dot.getAttribute('data-year'))+' · '+esc(dot.getAttribute('data-time'))+'</span>';
    tip.hidden=false;placeTip(dot,event);
  }
  function hideTip(){tip.hidden=true}
  [].forEach.call(wrap.querySelectorAll('circle[data-athlete]'),function(dot){
    dot.addEventListener('mouseenter',function(e){showTip(dot,e)});
    dot.addEventListener('mousemove',function(e){placeTip(dot,e)});
    dot.addEventListener('mouseleave',hideTip);
    dot.addEventListener('click',function(e){showTip(dot,e)});
    dot.addEventListener('focus',function(){showTip(dot,null)});
    dot.addEventListener('blur',hideTip);
  });
  wrap.scrollTop=wrap.scrollHeight;
  if(isFkt)points.slice().sort(function(a,b){return a.year-b.year||a.gender.localeCompare(b.gender)}).forEach(function(p){var s=document.createElement('span');s.className='cwes-milestone';s.textContent=p.year+' '+(p.gender==='F'?'Women':p.gender==='M'?'Men':'X')+': '+p.time+' - '+p.holders;milestones.appendChild(s)})
}
function render(){var rows=baseRows().sort(function(a,b){return b.year-a.year||(a.time_seconds||Infinity)-(b.time_seconds||Infinity)}),route=selectedRoute(),athletes=new Set(rows.map(function(r){return nameOf(r).toLowerCase()})),mb=best(route,'M'),fb=best(route,'F');root.querySelector('#cwes-stat-results').textContent=rows.length;root.querySelector('#cwes-stat-athletes').textContent=athletes.size;root.querySelector('#cwes-stat-male').textContent=route&&mb?mb.time:'-';root.querySelector('#cwes-stat-female').textContent=route&&fb?fb.time:'-';root.querySelector('#cwes-chart-title').textContent='Every recorded finish'+(personTerm()?' matching "'+personSearch.value.trim()+'"':'');plot(rows,false);root.querySelector('#cwes-table-count').textContent=rows.length+' result'+(rows.length===1?'':'s');var tbody=root.querySelector('#cwes-results-rows');tbody.innerHTML=rows.slice(0,1000).map(function(r){var src=r.source_url?'<a href="'+esc(r.source_url)+'" target="_blank" rel="noopener">UltraSignup</a>':esc(r.source_label),maleFkt=!!(route&&mb&&r.gender==='M'&&r.time_seconds===mb.time_seconds),femaleFkt=!!(route&&fb&&r.gender==='F'&&r.time_seconds===fb.time_seconds),rowClass=maleFkt?'cwes-fkt-m':femaleFkt?'cwes-fkt-f':'',badge=maleFkt?'<span class="cwes-fkt-badge">Men&#39;s FKT</span>':femaleFkt?'<span class="cwes-fkt-badge">Women&#39;s FKT</span>':'';return '<tr class="'+rowClass+'"><td>'+esc(r.route_key)+'</td><td>'+r.year+'</td><td>'+esc(nameOf(r))+badge+'</td><td>'+esc(r.gender)+'</td><td>'+esc(ageGroup(r.age))+'</td><td>'+esc([r.city,r.state].filter(Boolean).join(', '))+'</td><td>'+esc(r.time)+'</td><td>'+src+'</td></tr>'}).join('')||'<tr><td colspan="8">No matching results.</td></tr>'}
routeSearch.addEventListener('input',function(){fillRoutes();render()});personSearch.addEventListener('input',render);routeSelect.addEventListener('change',render);fillRoutes();var preferred=allSummaries.find(function(s){return s.route_key==='Oh deer, last ferry is at 10:30 pm!'});if(preferred)routeSelect.value=preferred.route_key;render();

}());
