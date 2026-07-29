import { FundSummary } from "@/features/funds/fund-summary";
import { getFundSummary } from "@/features/funds/fund-queries";

interface FundPageProps {
  params: Promise<{ fundId: string }>;
}

export default async function FundPage({ params }: FundPageProps) {
  const { fundId } = await params;
  const summary = await getFundSummary(fundId);

  return <FundSummary summary={summary} />;
}
