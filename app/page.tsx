import ResidentDashboard, { type ResidentData } from "./ResidentDashboard";
import residents from "./data/residents.json";

export default function Home() {
  return (
    <ResidentDashboard
      data={residents as ResidentData}
      naverClientId={process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? ""}
    />
  );
}
