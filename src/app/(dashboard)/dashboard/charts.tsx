"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const COLORS = ["#1A5276", "#1E8449", "#B7950B", "#C0392B", "#7D3C98", "#2874A6", "#117A65", "#B03A2E"];

export function MonthlyRevenueChart({ data }: { data: { mois: string; factures: number; encaisse: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="mois" fontSize={12} />
        <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => v.toLocaleString("fr-FR") + " FCFA"} />
        <Legend />
        <Line type="monotone" dataKey="factures" stroke="#1A5276" name="Factures émises" strokeWidth={2} />
        <Line type="monotone" dataKey="encaisse" stroke="#1E8449" name="Encaissé" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ExpensesByCategoryChart({ data }: { data: { categorie: string; montant: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="montant" nameKey="categorie" cx="50%" cy="50%" outerRadius={90} label={(e) => e.categorie}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => v.toLocaleString("fr-FR") + " FCFA"} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function InsuranceDebtChart({ data }: { data: { nom: string; reste: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis type="number" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey="nom" fontSize={12} width={140} />
        <Tooltip formatter={(v: number) => v.toLocaleString("fr-FR") + " FCFA"} />
        <Bar dataKey="reste" fill="#C0392B" name="Reste à percevoir" />
      </BarChart>
    </ResponsiveContainer>
  );
}
