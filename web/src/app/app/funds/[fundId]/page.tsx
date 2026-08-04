import { FundSummary } from "@/features/funds/fund-summary";
import { getFundSummary } from "@/features/funds/fund-queries";
import { AppReadFailure } from "@/shared/ui/app-read-failure";

interface FundPageProps {
  params: Promise<{ fundId: string }>;
}

export default async function FundPage({ params }: FundPageProps) {
  const { fundId } = await params;
  let summary;

  try {
    summary = await getFundSummary(fundId);
  } catch (error) {
    return <AppReadFailure error={error} />;
  }

  return <FundSummary summary={summary} />;
}
