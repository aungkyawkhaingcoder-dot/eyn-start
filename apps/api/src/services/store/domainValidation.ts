import { createError } from "../../utils";
export function domainName(value:unknown) {
 if(typeof value!=="string") throw createError("Enter a hostname, without a URL or path.",422,"Error_Domain");
 const host=value.trim().toLowerCase().replace(/\.$/,"");
 if(host.length>253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) || /\.(localhost|local|internal|test|invalid)$/.test(host))
  throw createError("Enter a valid public hostname, without a port or path.",422,"Error_Domain");
 return host;
}
export function assertCustomDomain(host:string) {
 const platform=(process.env.STOREFRONT_ROOT_DOMAIN||"").toLowerCase();
 const reserved=(process.env.PLATFORM_HOSTS||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if((platform && (host===platform || host.endsWith(`.${platform}`))) || reserved.includes(host))
  throw createError("This hostname is reserved for the platform.",422,"Error_Domain");
}
