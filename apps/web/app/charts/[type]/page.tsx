import { notFound } from "next/navigation";

import { chartTypes, ChartShowcase } from "../../../components/charts/showcase";

export const generateStaticParams = () =>
  chartTypes.flatMap(([type]) => (type === "overview" ? [] : [{ type }]));

const ChartTypePage = async ({
  params,
}: {
  params: Promise<{ type: string }>;
}) => {
  const { type } = await params;

  if (!chartTypes.some(([key]) => key === type)) {
    notFound();
  }

  return <ChartShowcase type={type} />;
};

export default ChartTypePage;
