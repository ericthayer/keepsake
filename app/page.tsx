import { getChatGPTUser } from "./chatgpt-auth";
import { LockerApp } from "./components/locker-app";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getChatGPTUser();
  return <LockerApp ownerName={user?.fullName?.split(" ")[0] ?? "Your"} />;
}
