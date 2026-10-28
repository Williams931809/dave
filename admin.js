const api=window.portfolioAPI,tools=window.portfolioContent;
const $=id=>document.getElementById(id);
let draft=null,revision=0,dirty=false,busy=false,editingIndex=-1,editing=null,previewWindow=null;
let pendingMedia=null,pendingThumbnail=null,objectURLs=[],fileSelection=0;
const labels={meta:'Page title & search description',brand:'Brand name',navigation:'Navigation links',hero:'Hero / introduction',approach:'Approach',reel:'Reel headings & filters',work:'Selected work',experience:'Experience',skills:'What I bring',contact:'Contact',footer:'Footer',heading:'Heading',intro:'Introduction',description:'Description',buttonLabel:'Button text',buttonHref:'Button link',title:'Title',name:'Name',label:'Label',href:'Link',eyebrow:'Small heading',tag:'Role / tag',text:'Text',adminLabel:'Admin link text',items:'Items',chips:'Tags',filters:'Category labels',all:'All projects',film:'Brand films',event:'Events',social:'Social',artist:'Artists'};
const templates={navigation:{label:'',href:''},'approach.items':{eyebrow:'',title:'',description:''},'work.items':{tag:'',title:'',description:'',chips:[]},'experience.items':{title:'',description:''},'skills.items':{title:'',items:[]}};
function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function status(target,message,state=''){const node=$(target);node.textContent=message;if(state)node.dataset.state=state;else node.removeAttribute('data-state');}
function markDirty(){dirty=true;$('draft-state').textContent='Unpublished changes';$('publish').disabled=busy;}
function setBusy(value){busy=value;$('publish').disabled=value||!dirty;$('save-project').disabled=value;$('close-project').disabled=value;$('cancel-project').disabled=value;}
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
window.addEventListener('portfolio-signed-out',()=>{signedOut();status('login-status','Your session expired. Sign in again; your current page draft is kept in this tab.','error');});
function signedOut(){$('auth-panel').hidden=false;$('workspace').hidden=true;$('sign-out').hidden=true;if($('project-dialog').open)$('project-dialog').close();}
async function signedIn(){
 $('auth-panel').hidden=true;$('workspace').hidden=false;$('sign-out').hidden=false;
 if(!draft){try{const result=await api.request('content');draft=structuredClone(result.content);revision=result.revision;renderAll();}catch(error){status('editor-status',error.message,'error');}}
}
$('login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;status('login-status','Signing in…');try{const form=new FormData(event.target);await api.request('login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:String(form.get('email')).trim(),password:String(form.get('password'))})});event.target.reset();status('login-status','');await signedIn();}catch(error){status('login-status',error.message,'error');}finally{button.disabled=false;}});
$('sign-out').addEventListener('click',async()=>{if(dirty&&!confirm('Discard your unpublished changes and sign out?'))return;try{await api.request('logout',{method:'POST'});draft=null;dirty=false;signedOut();}catch(error){status('editor-status',error.message,'error');}});
document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-panel]').forEach(b=>{b.setAttribute('aria-pressed',String(b===button));$('panel-'+b.dataset.panel).hidden=b!==button;});}));
function renderAll(){renderProjects();renderFields();}
function renderProjects(){
 const list=$('project-list');list.replaceChildren();$('project-count').textContent=String(draft.reel.projects.length);
 if(!draft.reel.projects.length){list.append(el('p','empty-state','Your reel is empty. Add a project to get started.'));return;}
 draft.reel.projects.forEach((item,index)=>{
  const card=el('article','project-card'),cover=el('div','card-cover'),image=tools.thumbnailURL(item);
  cover.append(el('span','cover-fallback',item.source.kind==='image'?'Image project':'Add a thumbnail for this video'));
  if(image){const img=el('img');img.src=image;img.alt=item.alt||item.title;img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});cover.append(img);}
  cover.append(el('span','badge',item.published?'Visible':'Hidden'));
  const body=el('div','card-body');body.append(el('h3','',item.title),el('p','',(draft.reel.filters[item.category]||item.category)+' · '+(['drive','youtube','vimeo'].includes(item.source.kind)?item.source.kind+' video':item.source.kind)));
  const actions=el('div','card-actions'),edit=el('button','edit','Edit project');edit.type='button';edit.addEventListener('click',()=>openEditor(index));actions.append(edit);
  for(const [direction,symbol] of [[-1,'↑'],[1,'↓']]){const button=el('button','',symbol);button.type='button';button.disabled=index+direction<0||index+direction>=draft.reel.projects.length;button.setAttribute('aria-label',`Move ${item.title} ${direction<0?'up':'down'}`);button.addEventListener('click',()=>{const items=draft.reel.projects;[items[index],items[index+direction]]=[items[index+direction],items[index]];markDirty();renderProjects();});actions.append(button);}
  const visibility=el('button','',item.published?'Hide':'Show');visibility.type='button';visibility.addEventListener('click',()=>{item.published=!item.published;markDirty();renderProjects();});actions.append(visibility);
  const remove=el('button','','Remove');remove.type='button';remove.addEventListener('click',()=>{if(!confirm(`Remove “${item.title}” from the reel? The change takes effect when you publish.`))return;draft.reel.projects.splice(index,1);markDirty();renderProjects();});actions.append(remove);body.append(actions);card.append(cover,body);list.append(card);
 });
}
function blank(value){if(Array.isArray(value))return [];if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,blank(v)]));return '';}
function field(parent,key,value,path){
 if(Array.isArray(value)){
  const group=el('fieldset','field-group'),legend=el('legend','',labels[key]||key),list=el('div','array-list');group.append(legend,list);
  const render=()=>{list.replaceChildren();value.forEach((item,index)=>{const card=el('div','array-card'),heading=el('div','array-heading'),controls=el('div','array-controls');heading.append(el('strong','',`${labels[key]||'Item'} ${index+1}`));
   for(const [delta,name] of [[-1,'Up'],[1,'Down']]){const b=el('button','',name);b.type='button';b.disabled=index+delta<0||index+delta>=value.length;b.setAttribute('aria-label',`Move item ${index+1} ${name.toLowerCase()}`);b.addEventListener('click',()=>{[value[index],value[index+delta]]=[value[index+delta],value[index]];markDirty();render();});controls.append(b);}
   const remove=el('button','','Remove');remove.type='button';remove.addEventListener('click',()=>{if(!confirm('Remove this item from the draft?'))return;value.splice(index,1);markDirty();render();});controls.append(remove);heading.append(controls);card.append(heading);
   if(typeof item==='object'&&item!==null){for(const [name,v] of Object.entries(item))field(card,name,v,[...path,index,name]);}else textField(card,'Text',item,next=>{value[index]=next;});list.append(card);
  });};render();const add=el('button','add-item','+ Add item');add.type='button';add.addEventListener('click',()=>{const template=templates[path.filter(x=>typeof x!=='number').join('.')];value.push(template?structuredClone(template):value.length?blank(value[0]):'');markDirty();render();});group.append(add);parent.append(group);
 }else if(value&&typeof value==='object'){
  const group=el('fieldset','field-group');group.append(el('legend','',labels[key]||key));for(const [name,v] of Object.entries(value)){if(name==='projects')continue;field(group,name,v,[...path,name]);}parent.append(group);
 }else {textField(parent,labels[key]||key,value,next=>{let object=draft;for(const segment of path.slice(0,-1))object=object[segment];object[path.at(-1)]=next;},['description','intro','text'].includes(key));}
}
let fieldCounter=0;
function textField(parent,label,value,onChange,multiline=false){const wrapper=el('label','',label),input=el(multiline?'textarea':'input');input.id='content-field-'+(++fieldCounter);input.value=value;input.maxLength=multiline?5000:200;if(multiline)input.rows=3;else input.type='text';input.addEventListener('input',()=>{onChange(input.value);markDirty();});wrapper.append(input);parent.append(wrapper);}
function renderFields(){
 for(const [target,keys] of [['page-fields',['hero','approach','reel','work','experience','skills','contact']],['settings-fields',['brand','navigation','meta','footer']]]){
  const host=$(target);host.replaceChildren();for(const key of keys){const section=el('details','content-section');section.append(el('summary','',labels[key]));const fields=el('div','section-fields');if(key==='navigation')field(fields,key,draft[key],[key]);else for(const [name,value] of Object.entries(draft[key])){if(name!=='projects')field(fields,name,value,[key,name]);}section.append(fields);host.append(section);}
 }
}
function clearURLs(){objectURLs.forEach(URL.revokeObjectURL);objectURLs=[];}
function localURL(file){const url=URL.createObjectURL(file);objectURLs.push(url);return url;}
function refreshThumbnail(){const host=$('thumbnail-preview');host.replaceChildren();let url=pendingThumbnail?localURL(pendingThumbnail):$('thumbnail-url').value.trim()||tools.thumbnailURL(editing);if(url){const image=el('img');image.src=url;image.alt='Project thumbnail preview';image.referrerPolicy='no-referrer';image.addEventListener('error',()=>{host.replaceChildren(el('span','','Cover could not be loaded. Upload an image instead.'));},{once:true});host.append(image);}else host.append(el('span','','No cover selected'));}
function toggleSource(){const kind=$('project-source').value,upload=kind.startsWith('upload-');$('source-file-field').hidden=!upload;$('source-url-field').hidden=upload;$('project-file').accept=kind==='upload-image'?'image/jpeg,image/png,image/gif,image/webp,image/avif':'video/mp4,video/webm,video/ogg,video/quicktime';$('current-media').textContent=upload&&editing.source.assetId?'Current uploaded media will be kept unless you choose another file.':'';}
function openEditor(index){
 clearURLs();fileSelection++;editingIndex=index;editing=index<0?{id:tools.id(),title:'',category:'film',description:'',layout:'landscape',published:true,source:{kind:'video',url:'',assetId:''},thumbnail:{url:'',assetId:''},alt:''}:structuredClone(draft.reel.projects[index]);pendingMedia=null;pendingThumbnail=null;$('project-form').reset();
 $('project-dialog-title').textContent=index<0?'Add a project':'Edit project';$('project-title').value=editing.title;$('project-category').value=editing.category;$('project-description').value=editing.description;$('project-layout').value=editing.layout;$('project-published').checked=editing.published;$('project-source').value=editing.source.assetId?(editing.source.kind==='image'?'upload-image':'upload-video'):editing.source.kind;$('project-url').value=editing.source.url;$('thumbnail-url').value=editing.thumbnail.url;$('project-alt').value=editing.alt;
 if(index<0)$('project-source').value='upload-video';toggleSource();refreshThumbnail();status('project-status','');$('project-dialog').showModal();
}
$('add-project').addEventListener('click',()=>openEditor(-1));
function closeProject(){if(busy)return;if((pendingMedia||pendingThumbnail)&&!confirm('Close without saving the selected media to your draft?'))return;$('project-dialog').close();clearURLs();fileSelection++;}
for(const id of ['close-project','cancel-project'])$(id).addEventListener('click',closeProject);
$('project-dialog').addEventListener('cancel',event=>{event.preventDefault();closeProject();});
$('project-source').addEventListener('change',()=>{pendingMedia=null;$('project-file').value='';fileSelection++;toggleSource();editing.source={kind:$('project-source').value.replace('upload-',''),url:$('project-url').value.trim(),assetId:''};refreshThumbnail();});
$('project-url').addEventListener('input',()=>{editing.source.url=$('project-url').value.trim();refreshThumbnail();});
$('thumbnail-url').addEventListener('input',()=>{pendingThumbnail=null;editing.thumbnail={url:$('thumbnail-url').value.trim(),assetId:''};$('project-thumbnail').value='';refreshThumbnail();});
$('project-thumbnail').addEventListener('change',()=>{const file=$('project-thumbnail').files[0];if(!file)return;if(!file.type.startsWith('image/')||file.size>10*1024*1024){status('project-status','Choose an image thumbnail up to 10 MB.','error');$('project-thumbnail').value='';return;}pendingThumbnail=file;editing.thumbnail={url:'',assetId:''};$('thumbnail-url').value='';refreshThumbnail();});
$('reset-thumbnail').addEventListener('click',()=>{pendingThumbnail=null;editing.thumbnail={url:'',assetId:''};$('thumbnail-url').value='';$('project-thumbnail').value='';refreshThumbnail();});
async function videoCover(file){
 return new Promise((resolve,reject)=>{const video=document.createElement('video');const url=URL.createObjectURL(file);let settled=false;const timeout=setTimeout(()=>finish(null),15000);
  function finish(blob){if(settled)return;settled=true;clearTimeout(timeout);video.removeAttribute('src');video.load();URL.revokeObjectURL(url);blob?resolve(new File([blob],'video-cover.jpg',{type:'image/jpeg'})):reject(new Error('Choose a thumbnail image for this video.'));}
  const capture=()=>{if(!video.videoWidth||!video.videoHeight){finish(null);return;}try{const canvas=document.createElement('canvas');const scale=Math.min(1,1280/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);canvas.toBlob(finish,'image/jpeg',.85);}catch{finish(null);}};
  video.preload='auto';video.muted=true;video.playsInline=true;video.onloadeddata=()=>{if(video.duration>1)video.currentTime=Math.min(1,video.duration/2);else capture();};video.onseeked=capture;video.onerror=()=>finish(null);video.src=url;
 });
}
$('project-file').addEventListener('change',async()=>{const file=$('project-file').files[0];if(!file)return;if(!file.size||file.size>100*1024*1024){status('project-status','Choose a non-empty file up to 100 MB.','error');$('project-file').value='';return;}pendingMedia=file;const selection=++fileSelection;
 if(file.type.startsWith('video/')&&!pendingThumbnail){status('project-status','Generating a cover image from your video…');try{const cover=await videoCover(file);if(selection!==fileSelection||pendingThumbnail)return;pendingThumbnail=cover;editing.thumbnail={url:'',assetId:''};$('thumbnail-url').value='';refreshThumbnail();status('project-status','Cover generated. You can replace it with your own thumbnail.');}catch(error){if(selection===fileSelection)status('project-status',error.message,'error');}}
 else if(file.type.startsWith('image/')&&!pendingThumbnail){editing.source.kind='image';$('thumbnail-preview').replaceChildren(Object.assign(document.createElement('img'),{src:localURL(file),alt:'Selected image preview'}));}
});
async function uploadAsset(file,label){const result=await api.upload({title:file.name.slice(0,100),category:'film',description:'',purpose:'asset'},file,percent=>status('project-status',`Uploading ${label}… ${percent}%`));return result.id;}
$('project-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;const kind=$('project-source').value,upload=kind.startsWith('upload-'),sourceKind=kind.replace('upload-','');const next={...editing,title:$('project-title').value.trim(),category:$('project-category').value,description:$('project-description').value.trim(),layout:$('project-layout').value,published:$('project-published').checked,alt:$('project-alt').value.trim(),source:{kind:sourceKind,url:upload?'':$('project-url').value.trim(),assetId:upload?editing.source.assetId:''},thumbnail:{...editing.thumbnail}};
 if(!next.title){status('project-status','Enter a project title.','error');return;}
 if(upload&&!pendingMedia&&!next.source.assetId){status('project-status','Choose a video or image file.','error');return;}
 if(!upload){try{if(new URL(next.source.url).protocol!=='https:')throw Error();if(['drive','youtube','vimeo'].includes(sourceKind)&&!tools.embedURL(next.source))throw Error();}catch{status('project-status','Enter a valid HTTPS link for the selected source.','error');return;}}
 const image=sourceKind==='image';if(!image&&!pendingThumbnail&&!next.thumbnail.assetId&&!next.thumbnail.url&&!tools.thumbnailURL(next)){status('project-status','Choose a thumbnail image or image link for this video.','error');return;}
 setBusy(true);try{
  if(pendingMedia){next.source.assetId=await uploadAsset(pendingMedia,image?'image':'video');next.source.url='';editing.source={...next.source};pendingMedia=null;}
  if(pendingThumbnail){next.thumbnail={url:'',assetId:await uploadAsset(pendingThumbnail,'thumbnail')};editing.thumbnail={...next.thumbnail};pendingThumbnail=null;}
  if(image&&!next.thumbnail.url&&!next.thumbnail.assetId)next.thumbnail={url:next.source.url,assetId:next.source.assetId};
  if(editingIndex<0)draft.reel.projects.push(next);else draft.reel.projects[editingIndex]=next;markDirty();renderProjects();$('project-dialog').close();clearURLs();status('editor-status','Project saved to draft. Click “Publish changes” to update the live site.','success');
 }catch(error){status('project-status',error.message,'error');}finally{setBusy(false);}
});
$('publish').addEventListener('click',async()=>{if(busy||!dirty)return;setBusy(true);status('editor-status','Publishing your website…');try{const result=await api.request('content',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:draft,revision})});revision=result.revision;dirty=false;$('draft-state').textContent='All changes published';status('editor-status','Published. Your live website now shows these changes.','success');}catch(error){status('editor-status',error.message,'error');}finally{setBusy(false);}});
$('preview-draft').addEventListener('click',()=>{if(!draft)return;previewWindow=window.open('index.html?preview=1','fetty-portfolio-preview');});
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===previewWindow&&event.data?.type==='portfolio-preview-ready')previewWindow.postMessage({type:'portfolio-preview',content:structuredClone(draft)},location.origin);});
api.request('session').then(result=>result.signedIn?signedIn():signedOut()).catch(error=>status('login-status',error.message,'error'));
