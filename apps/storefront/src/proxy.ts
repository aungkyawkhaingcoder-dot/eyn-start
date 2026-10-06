import {NextRequest,NextResponse} from "next/server";
import {hostRoute} from "./host-routing";
export async function proxy(request:NextRequest) {
 const root=(process.env.STOREFRONT_ROOT_DOMAIN||"").trim().toLowerCase();
 const platforms=(process.env.STOREFRONT_PLATFORM_HOSTS||"localhost,127.0.0.1").split(",").map(s=>s.trim().toLowerCase());
 const route=hostRoute(request.headers.get("host")||"",root,platforms);
 if(route.kind==="platform")return NextResponse.next();
 const unavailable=()=>new NextResponse("Storefront not available.",{status:404,headers:{"Cache-Control":"no-store"}});
 if(route.kind==="invalid")return unavailable();
 let slug:string;
 if(route.kind==="store")slug=route.slug;
 else {
  try {
   const api=(process.env.STOREFRONT_API_URL||"http://localhost:8080").replace(/\/$/,"");
   const response=await fetch(`${api}/api/v1/storefront-domains/resolve?hostname=${encodeURIComponent(route.hostname)}`,{cache:"no-store",signal:AbortSignal.timeout(4000)});
   if(response.status===404 || response.status===422)return unavailable();
   if(!response.ok)throw new Error("Domain resolver unavailable");
   const data=await response.json();if(typeof data.slug!=="string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))throw new Error("Invalid domain mapping");slug=data.slug;
  }catch{return new NextResponse("Storefront temporarily unavailable.",{status:503,headers:{"Cache-Control":"no-store"}});}
 }
 // Do not let another store's path be served under this store's hostname.
 if(request.nextUrl.pathname!=="/" && request.nextUrl.pathname!==`/shop/${slug}`)return unavailable();
 const url=request.nextUrl.clone();url.pathname=`/shop/${slug}`;
 return NextResponse.rewrite(url,{headers:{"Cache-Control":"no-store"}});
}
export const config={matcher:["/((?!_next/|favicon.ico|robots.txt).*)"]};
