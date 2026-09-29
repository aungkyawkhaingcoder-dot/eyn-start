"use client";
import { ColorArea, ColorField, ColorPicker, ColorSlider, ColorSwatch } from '@heroui/react';
export function BrandColorControl({label,value,onChange}:{label:string;value:string;onChange:(hex:string)=>void}) {
 return <div className="brand-color-control"><span>{label}</span>
 <ColorPicker value={value} onChange={color=>onChange(color.toString('hex'))}>
   <ColorPicker.Trigger aria-label={`Choose ${label}`}><ColorSwatch color={value}/></ColorPicker.Trigger>
   <ColorPicker.Popover className="brand-color-popover">
     <ColorArea colorSpace="hsb" xChannel="saturation" yChannel="brightness" aria-label={`${label} saturation and brightness`}><ColorArea.Thumb/></ColorArea>
     <ColorSlider channel="hue" colorSpace="hsb" aria-label={`${label} hue`}><ColorSlider.Track><ColorSlider.Thumb/></ColorSlider.Track></ColorSlider>
   </ColorPicker.Popover>
 </ColorPicker>
 <ColorField aria-label={`${label} hex`} value={value} onChange={color=>{if(color)onChange(color.toString('hex'));}}><ColorField.Group><ColorField.Input/></ColorField.Group></ColorField>
 </div>;
}
