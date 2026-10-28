window.portfolioAPI = {
 url(path) { return '/api/portfolio?path='+encodeURIComponent(path); },
 async request(path, options={}) {
  const response=await fetch(this.url(path),{credentials:'same-origin',...options});
  let data;try{data=await response.json();}catch{throw new Error('The service returned an unexpected response. Please try again.');}
  if(!response.ok){if(response.status===401)window.dispatchEvent(new Event('portfolio-signed-out'));throw new Error(data.error||'The request failed. Please try again.');}
  return data;
 },
 async upload(details,file,onProgress) {
  const {id,chunkSize}=await this.request('uploads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...details,file_name:file.name,media_type:file.type,size:file.size})});
  for(let offset=0,index=0;offset<file.size;offset+=chunkSize,index++){
   let failure;
   for(let attempt=0;attempt<3;attempt++){try{await this.request(`uploads/${id}/${index}`,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:file.slice(offset,offset+chunkSize)});failure=null;break;}catch(error){failure=error;}}
   if(failure)throw failure;
   onProgress(Math.round(Math.min(file.size,offset+chunkSize)/file.size*100));
  }
  return this.request(`uploads/${id}/complete`,{method:'POST'});
 }
};
