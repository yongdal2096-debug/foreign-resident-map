import ResidentDashboard, { type Province, type ResidentData } from "./ResidentDashboard";
import summary from "./data/summary.json";
import provinces1 from "./data/provinces-1.json";
import provinces2 from "./data/provinces-2.json";
import provinces3 from "./data/provinces-3.json";
import provinces4 from "./data/provinces-4.json";
import provinces5 from "./data/provinces-5.json";

const residents: ResidentData = {
  ...summary,
  provinces: [
    ...provinces1,
    ...provinces2,
    ...provinces3,
    ...provinces4,
    ...provinces5,
  ] as Province[],
};

export default function Home() {
  return (
    <ResidentDashboard
      data={residents}
      naverClientId={process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? ""}
    />
  );
}
