"use client";
import { createContext, useContext, useEffect, useRef } from 'react';
import { useSelector } from '@legendapp/state/react';
import type { Observable } from '@legendapp/state';
import type { StoreDraft } from '../../types/store';
export const CopyEditorContext = createContext<Observable<StoreDraft> | null>(null);
export const copyLimits = {heroTitle:160,heroText:500,buttonLabel:60,collectionTitle:100,featuredTitle:100,bestTitle:100,aboutTitle:100,aboutText:1000};
export type CopyKey = keyof typeof copyLimits;
export function EditableCopy({name,fallback,value}:{name:CopyKey;fallback:string;value?:string}) {
 const draft=useContext(CopyEditorContext);
 const text=useSelector(()=>draft ? draft.storefrontConfig[name].get() || '' : value || '');
 const ref=useRef<HTMLSpanElement>(null);
 const edited=useRef(false);
 useEffect(()=>{const node=ref.current;if(node && node.ownerDocument.activeElement!==node)node.textContent=text||fallback;},[text,fallback]);
 if(!draft)return <>{value||fallback}</>;
 const commit=(node:HTMLElement)=>{const value=(node.textContent||'').slice(0,copyLimits[name]);draft.storefrontConfig[name].set(value);};
 return <span ref={ref} contentEditable="plaintext-only" suppressContentEditableWarning role="textbox" aria-label={`Edit ${name}`} aria-multiline={name==='heroText'||name==='aboutText'} tabIndex={0} className="sf-editable-copy"
 onClick={e=>{e.preventDefault();e.stopPropagation();}}
 onFocus={()=>{edited.current=false;}}
 onInput={e=>{edited.current=true;if(!(e.nativeEvent as InputEvent).isComposing)commit(e.currentTarget);}}
 onCompositionEnd={e=>{edited.current=true;commit(e.currentTarget);}}
 onBlur={e=>{if(edited.current)commit(e.currentTarget);edited.current=false;e.currentTarget.textContent=draft.storefrontConfig[name].peek()||fallback;}}
 onKeyDown={e=>{if(e.key==='Enter' && name!=='heroText' && name!=='aboutText'){e.preventDefault();e.currentTarget.blur();}}}
 />;
}
