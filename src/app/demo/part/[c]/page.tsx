import { PartView } from "../../../../components/DemoParts";

// Renders a single real component in isolation, keyed by slug. Framed by the
// /demo/components gallery via iframe. Scratch route — remove with the demos.
export default async function DemoPart({
  params,
}: {
  params: Promise<{ c: string }>;
}) {
  const { c } = await params;
  return <PartView name={c} />;
}
