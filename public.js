const api=window.portfolioAPI,contentTools=window.portfolioContent;
let content,activeFilter='all';
const grid=document.querySelector('.grid'),preview=document.querySelector('#work-preview'),previewContent=document.querySelector('#preview-content');
function element(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function setText(selector,text){const el=document.querySelector(selector);if(el)el.textContent=text;}
function renderProjects(){
 grid.replaceChildren();
 for(const project of content.reel.projects.filter(p=>p.published)){
  const tile=element('button','tile uploaded-tile'+(project.layout==='portrait'?' tall':''));tile.type='button';tile.dataset.cat=project.category;tile.hidden=activeFilter!=='all'&&activeFilter!==project.category;tile.setAttribute('aria-label','View '+project.title);
  const thumbnail=contentTools.thumbnailURL(project);
  if(thumbnail){const img=element('img');img.src=thumbnail;img.alt=project.alt||project.title;img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});tile.append(img);}
  else if(project.source.kind==='video'){const video=element('video');video.src=contentTools.mediaURL(project.source);video.muted=true;video.playsInline=true;video.preload='metadata';tile.append(video);}
  if(project.source.kind!=='image')tile.append(element('span','play'));
  tile.append(element('small','',content.reel.filters[project.category]),element('h3','',project.title));tile.addEventListener('click',()=>openProject(project));grid.append(tile);
 }
 if(!grid.children.length)grid.append(element('p','lede','No projects in this category yet.'));
}
function openProject(project){
 previewContent.replaceChildren();const embedded=['drive','youtube','vimeo'].includes(project.source.kind);const media=element(embedded?'iframe':project.source.kind==='image'?'img':'video',embedded?'preview-frame':'preview-media');
 const url=embedded?contentTools.embedURL(project.source):contentTools.mediaURL(project.source);
 if(url){media.src=url;if(embedded){media.title=project.title;media.allow='autoplay; picture-in-picture; fullscreen';media.allowFullscreen=true;media.referrerPolicy='no-referrer';}else if(media.tagName==='VIDEO'){media.controls=true;media.autoplay=true;media.playsInline=true;const thumbnail=contentTools.thumbnailURL(project);if(thumbnail)media.poster=thumbnail;}else media.alt=project.alt||project.title;previewContent.append(media);}else previewContent.append(element('p','preview-copy','This video link needs to be updated.'));
 const copy=element('div','preview-copy'),details=element('div'),title=element('h3','',project.title);title.id='preview-title';details.append(title);if(project.description)details.append(element('p','',project.description));const close=element('button','preview-close','Close');close.type='button';close.addEventListener('click',()=>preview.close());copy.append(details,close);previewContent.append(copy);preview.showModal();
}
function applyContent(data){
 content=data;document.title=data.meta.title;let meta=document.querySelector('meta[name="description"]');if(!meta){meta=document.createElement('meta');meta.name='description';document.head.append(meta);}meta.content=data.meta.description;
 setText('nav>span',data.brand.name);const nav=document.querySelector('nav>div');nav.replaceChildren(...data.navigation.map(item=>{const link=element('a','',item.label);link.href=item.href;return link;}));
 setText('.hero h1',data.hero.heading);setText('.hero p',data.hero.description);setText('.hero .btn',data.hero.buttonLabel);document.querySelector('.hero .btn').href=data.hero.buttonHref;
 setText('#arc h2',data.approach.heading);setText('#arc .lede',data.approach.intro);document.querySelector('.arc').replaceChildren(...data.approach.items.map(item=>{const box=element('div');box.append(element('small','',item.eyebrow),element('h3','',item.title),element('p','',item.description));return box;}));
 setText('#reel h2',data.reel.heading);setText('#reel .lede',data.reel.intro);const filters=document.querySelector('.filters');filters.replaceChildren(...Object.entries(data.reel.filters).map(([key,label])=>{const button=element('button','',label);button.type='button';button.dataset.f=key;button.setAttribute('aria-pressed',String(key===activeFilter));button.addEventListener('click',()=>{activeFilter=key;filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderProjects();});return button;}));renderProjects();
 setText('#work h2',data.work.heading);setText('#work .lede',data.work.intro);document.querySelector('.work').replaceChildren(...data.work.items.map(item=>{const box=element('div','job'),details=element('div'),chips=element('div','chips');chips.append(...item.chips.map(x=>element('span','',x)));details.append(element('h3','',item.title),element('p','',item.description),chips);box.append(element('div','tag',item.tag),details);return box;}));
 setText('#roles h2',data.experience.heading);document.querySelector('.roles').replaceChildren(...data.experience.items.map(item=>{const li=element('li');li.append(element('b','',item.title),element('span','',item.description));return li;}));
 const skills=document.querySelector('.skills');skills.parentElement.querySelector('h2').textContent=data.skills.heading;skills.replaceChildren(...data.skills.items.map(item=>{const box=element('div'),list=element('ul');list.append(...item.items.map(x=>element('li','',x)));box.append(element('h3','',item.title),list);return box;}));
 setText('#contact h2',data.contact.heading);setText('#contact .btn',data.contact.buttonLabel);document.querySelector('#contact .btn').href=data.contact.buttonHref;
 setText('footer span',data.footer.text);setText('footer a',data.footer.adminLabel);
}
preview.addEventListener('click',event=>{if(event.target===preview)preview.close();});preview.addEventListener('close',()=>previewContent.replaceChildren());
if(new URLSearchParams(location.search).has('preview')&&window.opener){
 const banner=element('div','','Draft preview — these changes are not published.');banner.style.cssText='position:sticky;top:0;z-index:99;padding:12px 24px;background:#10202a;color:white;text-align:center;font:600 14px system-ui';document.body.prepend(banner);
 window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===window.opener&&event.data?.type==='portfolio-preview')applyContent(event.data.content);});window.opener.postMessage({type:'portfolio-preview-ready'},location.origin);
}else {
 api.request('content').then(result=>applyContent(result.content)).catch(async()=>{try{const response=await fetch('default-content.json');applyContent(await response.json());}catch(error){console.error('Could not load portfolio content',error);}});
}
