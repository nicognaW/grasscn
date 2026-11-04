import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { chartTypes, ChartShowcase } from "../../../components/charts/showcase";
import { pageMetadata } from "../../../lib/site";

export const generateStaticParams = () =>
  chartTypes.flatMap(([type]) => (type === "overview" ? [] : [{ type }]));

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> => {
  const { type } = await params;
  const label = chartTypes.find(([key]) => key === type)?.[1];

  return label
    ? pageMetadata({
        description: `${label} charts in pixel-perfect Minecraft style, built on shadcn.`,
        path: `/charts/${type}`,
        title: `${label} charts`,
      })
    : {};
};

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
