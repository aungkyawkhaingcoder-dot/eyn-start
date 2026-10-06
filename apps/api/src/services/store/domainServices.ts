import { randomBytes } from "node:crypto";
import { Resolver } from "node:dns/promises";
import { prisma } from "../../lib/prisma";
import { createError } from "../../utils";
import { ownedStore } from "./storeServices";
import { domainName, assertCustomDomain } from "./domainValidation";
const missing=()=>createError("Domain not found.",404,"Error_NotFound");
export async function listDomains(ownerId:number,storeId:number) {
 await ownedStore(ownerId,storeId);
 return prisma.storeDomain.findMany({where:{storeId},orderBy:{createdAt:"asc"}});
}
export async function claimDomain(ownerId:number,storeId:number,input:unknown) {
 await ownedStore(ownerId,storeId);
 const hostname=domainName(input);assertCustomDomain(hostname);
 const now=new Date();const verificationToken=`eyn-verify=${randomBytes(24).toString("hex")}`;
 const data={storeId,verificationToken,expiresAt:new Date(now.getTime()+86400000),verifiedAt:null};
 try {
  return await prisma.$transaction(async tx=>{
   const existing=await tx.storeDomain.findUnique({where:{hostname}});
   if(existing) {
    if(existing.storeId===storeId) return existing;
    const reclaimed=await tx.storeDomain.updateMany({where:{id:existing.id,verifiedAt:null,expiresAt:{lt:now}},data});
    if(!reclaimed.count) throw createError("This domain is already claimed. Unverified claims expire after 24 hours.",409,"Error_DomainClaimed");
    return tx.storeDomain.findUniqueOrThrow({where:{hostname}});
   }
   return tx.storeDomain.create({data:{hostname,...data}});
  });
 }catch(error){if((error as {code?:string}).code==="P2002")throw createError("This domain is already claimed.",409,"Error_DomainClaimed");throw error;}
}
export async function verifyDomain(ownerId:number,storeId:number,id:number) {
 await ownedStore(ownerId,storeId);
 const domain=await prisma.storeDomain.findFirst({where:{id,storeId}});if(!domain)throw missing();
 if(!domain.verifiedAt && domain.expiresAt<new Date())throw createError("Claim expired. Remove and add the domain again.",409,"Error_DomainExpired");
 const resolver=new Resolver({timeout:3000,tries:1});
 let records:string[][];
 try{records=await resolver.resolveTxt(`_eyn-verification.${domain.hostname}`);}catch{throw createError("TXT record not found yet. Check DNS and try again.",422,"Error_DomainDNS");}
 if(!records.some(record=>record.join("")===domain.verificationToken))throw createError("TXT verification value does not match.",422,"Error_DomainDNS");
 const result=await prisma.storeDomain.updateMany({where:{id,storeId,verificationToken:domain.verificationToken,OR:[{verifiedAt:{not:null}},{expiresAt:{gt:new Date()}}]},data:{verifiedAt:new Date()}});
 if(!result.count)throw createError("Domain claim changed. Refresh and try again.",409,"Error_DomainClaimed");
 return prisma.storeDomain.findFirstOrThrow({where:{id,storeId}});
}
export async function removeDomain(ownerId:number,storeId:number,id:number) {
 await ownedStore(ownerId,storeId);
 const result=await prisma.storeDomain.deleteMany({where:{id,storeId}});if(!result.count)throw missing();
}
export async function resolveDomain(input:unknown) {
 const hostname=domainName(input);
 const domain=await prisma.storeDomain.findFirst({where:{hostname,verifiedAt:{not:null},store:{published:true,owner:{status:"ACTIVE"}}},select:{store:{select:{slug:true}}}});
 if(!domain)throw missing();return {slug:domain.store.slug};
}
