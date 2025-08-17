// lib/marketing.ts
import {
    FolderOpen,
    RefreshCw,
    MapPin,
    ReceiptText,
    ClipboardCheck,
    Archive,
  } from "lucide-react";
  
  // Feature cards (icon + title + description)
  export const features = [
    {
      icon: FolderOpen,
      title: "Vehicle binder",
      desc: "All compliance docs in one place per vehicle.",
    },
    {
      icon: RefreshCw,
      title: "Renewal automation",
      desc: "Tasks auto‑create for expiring/missing items.",
    },
    {
      icon: MapPin,
      title: "Province‑aware",
      desc: "CVOR (ON), Safety Fitness (QC/AB), NSC Std. 11.",
    },
    {
      icon: ReceiptText,
      title: "IFTA support",
      desc: "Track quarterly filings and reminders.",
    },
    {
      icon: ClipboardCheck,
      title: "DVIR (optional)",
      desc: "Daily inspections & defect workflow.",
    },
    {
      icon: Archive,
      title: "Audit pack",
      desc: "One‑click ZIP/PDF for roadside or auditors.",
    },
  ] as const;
  
  // Pricing cards
  export const pricing = [
    { name: "Starter", blurb: "Up to 5 vehicles", price: "$0 (demo)" },
    { name: "Team", blurb: "Up to 25 vehicles", price: "Contact" },
    { name: "Business", blurb: "50+ vehicles", price: "Contact" },
  ] as const;
  
  // “How it works” steps
  export const steps = [
    { title: "Add vehicles", desc: "Upload/enter registrations, insurance, inspections, etc." },
    { title: "We track & remind", desc: "Compliance score + tasks for expiring/missing items." },
    { title: "Stay audit‑ready", desc: "Export a read‑only binder ZIP/PDF any time." },
  ] as const;