"use client";
import { useSelector } from '@legendapp/state/react';
import type { Observable } from '@legendapp/state';
import { ColorSlider, ColorPicker, ColorArea, ColorSwatch } from '@heroui/react';
import type { StoreDraft } from '../types/store';
import { brandColors, defaultColors, contrast } from './storefront/design';

export function ThemeToolbar({draft}:{draft:Observable<StoreDraft>}) {
 const snapshot=useSelector(()=>JSON.stringify({theme:draft.theme.get(),...Object.fromEntries(['primary','background','fontFamily','radius','formRadius'].map(k=>[k,draft.storefrontConfig[k as 'primary'].get()]))}));
 const values=JSON.parse(snapshot),dark=values.theme==='eyn-dark';
 const primary=values.primary||'#c8a46b', background=values.background||defaultColors(dark).background;
 const accent=(hex:string)=>draft.storefrontConfig.assign(brandColors(hex,'Analogous',dark));
 const base=(hex:string)=>{
   const white=contrast(hex,'#ffffff')>contrast(hex,'#080808');
   draft.storefrontConfig.assign({background:hex,surface:hex,text:white?'#ffffff':'#080808',muted:white?'#ffffff':'#080808'});
 };
 return <div className="theme-quick-toolbar" aria-label="Storefront theme controls">
  <div className="theme-quick-control"><span>Accent</span><div className="theme-slider-row">
   <ColorSlider aria-label="Accent hue" channel="hue" colorSpace="hsb" value={primary} onChange={c=>accent(c.toString('hex'))}><ColorSlider.Track><ColorSlider.Thumb/></ColorSlider.Track></ColorSlider>
   <ColorPicker value={primary} onChange={c=>accent(c.toString('hex'))}><ColorPicker.Trigger aria-label="Choose accent"><ColorSwatch color={primary}/></ColorPicker.Trigger><ColorPicker.Popover className="brand-color-popover"><ColorArea aria-label="Accent saturation and brightness" colorSpace="hsb" xChannel="saturation" yChannel="brightness"><ColorArea.Thumb/></ColorArea></ColorPicker.Popover></ColorPicker>
  </div></div>
  <div className="theme-quick-control"><span>Base</span><ColorSlider aria-label="Base brightness" channel="brightness" colorSpace="hsb" value={background} onChange={c=>base(c.toString('hex'))}><ColorSlider.Track><ColorSlider.Thumb/></ColorSlider.Track></ColorSlider></div>
  <label className="theme-quick-control">Font family<select value={values.fontFamily||'system'} onChange={e=>draft.storefrontConfig.fontFamily.set(e.target.value)}><option value="system">System sans</option><option value="arial">Arial</option><option value="georgia">Georgia</option></select></label>
  <label className="theme-quick-control">Radius<select value={values.radius||'8'} onChange={e=>draft.storefrontConfig.radius.set(e.target.value)}>{['0','4','8','12','16'].map(v=><option key={v} value={v}>{v}px</option>)}</select></label>
  <label className="theme-quick-control">Form radius<select value={values.formRadius||'8'} onChange={e=>draft.storefrontConfig.formRadius.set(e.target.value)}>{['0','4','8','12','16'].map(v=><option key={v} value={v}>{v}px</option>)}</select></label>
  <label className="theme-quick-control">Theme<select value={dark?'eyn-dark':'eyn-light'} onChange={e=>{draft.theme.set(e.target.value as 'eyn-dark'|'eyn-light');draft.storefrontConfig.assign(brandColors(primary,'Analogous',e.target.value==='eyn-dark'));}}><option value="eyn-light">Light</option><option value="eyn-dark">Dark</option></select></label>
 </div>;
}
