import { ChartShowcase } from "../../components/charts/showcase";
import { pageMetadata } from "../../lib/site";

export const metadata = pageMetadata({
  description:
    "Minecraft-style shadcn charts: F3 debug metrics, frame time, bar, line, area, pie, radar and radial.",
  path: "/charts",
  title: "Charts",
});

const ChartsPage = () => <ChartShowcase />;

export default ChartsPage;
