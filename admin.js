const client=window.portfolioAPI;
const authPanel=document.querySelector('#auth-panel'),workspace=document.querySelector('#workspace'),loginForm=document.querySelector('#login-form'),loginStatus=document.querySelector('#login-status'),uploadForm=document.querySelector('#upload-form'),fileInput=document.querySelector('#work-file'),imagePreview=document.querySelector('#image-preview'),videoPreview=document.querySelector('#video-preview'),uploadStatus=document.querySelector('#upload-status'),libraryList=document.querySelector('#library-list'),itemCount=document.querySelector('#item-count');
const categories={film:'Brand film',event:'Event coverage',social:'Social cut',artist:'Artist visual'};
let selectedPreviewUrl='';
function setStatus(element,message,state=''){element.textContent=message;if(state)element.dataset.state=state;else element.removeAttribute('data-state');}
function setSession(signedIn){authPanel.hidden=signedIn;workspace.hidden=!signedIn;if(signedIn)renderLibrary();else libraryList.replaceChildren();}
window.addEventListener('portfolio-signed-out',()=>setSession(false));
function resetPreview(){if(selectedPreviewUrl)URL.revokeObjectURL(selectedPreviewUrl);selectedPreviewUrl='';for(const preview of [imagePreview,videoPreview]){preview.removeAttribute('src');preview.dataset.visible='false';}}
fileInput.addEventListener('change',()=>{resetPreview();const file=fileInput.files[0];if(!file)return;selectedPreviewUrl=URL.createObjectURL(file);const preview=file.type.startsWith('video/')?videoPreview:imagePreview;preview.src=selectedPreviewUrl;preview.dataset.visible='true';});
async function renderLibrary(){
 try {
  const {data}=await client.request('work');libraryList.replaceChildren();itemCount.textContent=`${data.length} ${data.length===1?'upload':'uploads'}`;
  if(!data.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='No published work yet.';libraryList.append(empty);}
  for(const item of data){
   const row=document.createElement('article');row.className='work-item';
   const media=document.createElement(item.media_type.startsWith('video/')?'video':'img');media.src=client.url('media/'+item.id);if(media.tagName==='VIDEO'){media.muted=true;media.playsInline=true;media.preload='metadata';}else media.alt='';
   const details=document.createElement('div'),title=document.createElement('h3'),description=document.createElement('p');title.textContent=item.title;description.textContent=`${categories[item.category]} · ${item.file_name}`;details.append(title,description);
   const button=document.createElement('button');button.type='button';button.className='delete';button.textContent='Delete';button.setAttribute('aria-label',`Delete ${item.title}`);
   button.addEventListener('click',async()=>{if(!confirm(`Delete “${item.title}” from the public portfolio?`))return;button.disabled=true;try{await client.request('work/'+item.id,{method:'DELETE'});await renderLibrary();setStatus(uploadStatus,'Project removed from the public portfolio.','success');}catch(error){setStatus(uploadStatus,error.message,'error');button.disabled=false;}});
   row.append(media,details,button);libraryList.append(row);
  }
 }catch(error){setStatus(uploadStatus,error.message,'error');}
}
loginForm.addEventListener('submit',async event=>{event.preventDefault();const button=loginForm.querySelector('button');button.disabled=true;setStatus(loginStatus,'Signing in…');try{const form=new FormData(loginForm);await client.request('login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:String(form.get('email')).trim(),password:String(form.get('password'))})});loginForm.reset();setStatus(loginStatus,'');setSession(true);}catch(error){setStatus(loginStatus,error.message,'error');}finally{button.disabled=false;}});
document.querySelector('#sign-out').addEventListener('click',async()=>{try{await client.request('logout',{method:'POST'});setSession(false);}catch(error){setStatus(uploadStatus,error.message,'error');}});
uploadForm.addEventListener('submit',async event=>{
 event.preventDefault();if(!uploadForm.reportValidity())return;
 const file=fileInput.files[0];if(!file||file.size<1||file.size>100*1024*1024){setStatus(uploadStatus,'Choose a non-empty image or video up to 100 MB.','error');return;}
 const button=uploadForm.querySelector('button');button.disabled=true;setStatus(uploadStatus,'Preparing upload…');
 try{const data=new FormData(uploadForm);await client.upload({title:String(data.get('title')).trim(),category:String(data.get('category')),description:String(data.get('description')).trim()},file,percent=>setStatus(uploadStatus,percent===100?'Publishing project…':`Uploading media… ${percent}%`));uploadForm.reset();resetPreview();setStatus(uploadStatus,'Published. Visitors can now view this project on the portfolio.','success');await renderLibrary();}catch(error){setStatus(uploadStatus,error.message,'error');}finally{button.disabled=false;}
});
client.request('session').then(result=>setSession(result.signedIn)).catch(error=>setStatus(loginStatus,error.message,'error'));
