import type {Request,Response} from "express";
import * as domains from "../services/store/domainServices";
import {positiveId} from "../services/store/validation";
const owner=(req:Request)=>Number((req as Request & {userId:number}).userId);
export async function list(req:Request,res:Response){res.json(await domains.listDomains(owner(req),positiveId(req.params.storeId)));}
export async function claim(req:Request,res:Response){res.status(201).json(await domains.claimDomain(owner(req),positiveId(req.params.storeId),req.body?.hostname));}
export async function verify(req:Request,res:Response){res.json(await domains.verifyDomain(owner(req),positiveId(req.params.storeId),positiveId(req.params.id)));}
export async function remove(req:Request,res:Response){await domains.removeDomain(owner(req),positiveId(req.params.storeId),positiveId(req.params.id));res.status(204).end();}
export async function resolve(req:Request,res:Response){res.setHeader("Cache-Control","no-store");res.json(await domains.resolveDomain(req.query.hostname));}
