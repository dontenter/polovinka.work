"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, MessageCircle, Map, GraduationCap, HeartPulse, FileCheck2, House, ListChecks } from "lucide-react";
export const brazilSections = [
  { href: "/life/brazil/schools", label: "Школы", icon: GraduationCap },
  { href: "/life/brazil/hospitals", label: "Больницы и роды", icon: HeartPulse },
  { href: "/life/brazil/legalization", label: "Легализация", icon: FileCheck2 },
  { href: "/life/brazil/everyday", label: "Быт и жильё", icon: House },
  { href: "/life/brazil/plan", label: "План переезда", icon: ListChecks },
];
export function BrazilNavigation() {
 const path = usePathname();
 return <aside className="brazil-menu"><Link href="/life" className="back-link" title="Вернуться в Life"><ArrowLeft size={20}/><span>Life</span></Link><Link href="/life/brazil" className="menu-brand" aria-label="Brazil — главная"><span aria-hidden="true">🇧🇷</span><strong>Brazil</strong></Link><nav className="brazil-nav" aria-label="Разделы Brazil">{[{href:"/life/brazil", label:"Карта", icon:Map}, {href:"/life/brazil/chat",label:"Чат по Бразилии",icon:MessageCircle}, ...brazilSections].map(({href,label,icon:Icon})=><Link key={href} href={href} title={label} aria-label={label} aria-current={path===href?"page":undefined}><Icon size={23} strokeWidth={1.7}/><span>{label}</span></Link>)}</nav></aside>;
}
export function BrazilSectionCards() {return <nav className="section-cards" aria-label="Открыть раздел">{brazilSections.map(({href,label,icon:Icon})=><Link key={href} href={href}><span className="section-icon"><Icon size={30} strokeWidth={1.6}/></span><span>{label}</span></Link>)}</nav>;}
