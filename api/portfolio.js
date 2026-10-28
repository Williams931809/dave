// Only this server-side gateway knows the private Sites service credential.
export default {
 async fetch(request) {
  const url=new URL(request.url),path=url.searchParams.get('path')||'';
  const allowed=/^(health|content|login|logout|session|work(?:\/[a-f0-9-]{36})?|media\/[a-f0-9-]{36}|uploads(?:\/[a-f0-9-]{36}(?:\/(?:\d+|complete))?)?)$/;
  const fail=(message,status)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
  if(!allowed.test(path))return fail('Not found',404);
  if(!['GET','HEAD','POST','PUT','DELETE'].includes(request.method))return fail('Method not allowed',405);
  if(!['GET','HEAD'].includes(request.method)){
   if(request.headers.get('origin')!==url.origin)return fail('Please use the admin panel on this website.',403);
   if(Number(request.headers.get('content-length')||0)>3*1024*1024+4096)return fail('Upload part too large.',413);
  }
  const origin=process.env.PORTFOLIO_BACKEND_URL,token=process.env.PORTFOLIO_BACKEND_TOKEN;
  if(!origin||!token)return fail('The portfolio backend is being configured. Please try again shortly.',503);
  const headers=new Headers({'OAI-Sites-Authorization':`Bearer ${token}`});
  for(const name of ['cookie','range','content-type'])if(request.headers.has(name))headers.set(name,request.headers.get(name));
  headers.set('x-client-ip',request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-real-ip')||'unknown');
  try {
   const init={method:request.method,headers,redirect:'manual'};
   if(!['GET','HEAD'].includes(request.method)){init.body=request.body;init.duplex='half';}
   const result=await fetch(new URL(`/api/${path}`,origin),init);
   if(result.status>=300&&result.status<400)return fail('Backend access needs attention.',502);
   const output=new Headers();
   for(const name of ['content-type','content-length','content-range','accept-ranges','cache-control','set-cookie','x-content-type-options','content-security-policy'])if(result.headers.has(name))output.set(name,result.headers.get(name));
   return new Response(result.body,{status:result.status,headers:output});
  } catch {return fail('The backend could not be reached. Please try again.',502);}
 }
};
