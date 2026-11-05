'use client';
import {useState} from 'react';
export default function SellerLogo({url,name,className}){const [failed,setFailed]=useState(false);return url&&!failed?<img className={className} src={url} width="96" height="96" alt={`${name} logo`} onError={()=>setFailed(true)}/>:<span className={className} aria-hidden="true">{name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</span>;}
