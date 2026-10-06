export function hostRoute(hostHeader:string, root:string, platformHosts:string[]) {
 const host=hostHeader.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
 if(!host || /[^a-z0-9.-]/.test(host))return {kind:"invalid"} as const;
 if(platformHosts.includes(host) || host===root)return {kind:"platform"} as const;
 if(root && host.endsWith(`.${root}`)) {
  const slug=host.slice(0,-root.length-1);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length<3 || slug.length>60 || ["www","api","admin","merchant","mail","support"].includes(slug))return {kind:"invalid"} as const;
  return {kind:"store",slug} as const;
 }
 return {kind:"custom",hostname:host} as const;
}
