import { listFundsOverview } from "@/features/funds/fund-queries";
import { FundsOverview } from "@/features/funds/funds-overview";
import { AppReadFailure } from "@/shared/ui/app-read-failure";

export default async function FundsPage() {
  let sections;

  try {
    sections = await listFundsOverview();
  } catch (error) {
    return <AppReadFailure error={error} />;
  }

  return <FundsOverview sections={sections} />;
}
