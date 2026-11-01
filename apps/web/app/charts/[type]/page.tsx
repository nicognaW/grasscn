import { notFound } from "next/navigation";

import { chartTypes, ChartShowcase } from "../../../components/charts/showcase";

export function generateStaticParams() {
  return chartTypes
    .filter(([key]) => key !== "overview")
    .map(([type]) => ({ type }));
}

export default async function ChartTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!chartTypes.some(([key]) => key === type)) notFound();
  return <ChartShowcase type={type} />;
}
