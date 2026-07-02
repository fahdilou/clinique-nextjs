"use client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/skeleton";

const ChartFallback = () => <Skeleton className="h-[280px] w-full" />;

export const MonthlyRevenueChart = dynamic(
  () => import("./charts").then((m) => m.MonthlyRevenueChart),
  { loading: () => <ChartFallback />, ssr: false }
);

export const ExpensesByCategoryChart = dynamic(
  () => import("./charts").then((m) => m.ExpensesByCategoryChart),
  { loading: () => <ChartFallback />, ssr: false }
);

export const InsuranceDebtChart = dynamic(
  () => import("./charts").then((m) => m.InsuranceDebtChart),
  { loading: () => <ChartFallback />, ssr: false }
);
