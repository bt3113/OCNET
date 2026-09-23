// Reserved production boundary. Fail closed until verified provider routing,
// rate limiting, spam controls, and delivery consent are implemented.
Deno.serve((request:Request)=>{
 if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{Allow:'POST'}});
 return Response.json({error:'Provider delivery is not enabled. Create a project brief instead.'},{status:503});
});
