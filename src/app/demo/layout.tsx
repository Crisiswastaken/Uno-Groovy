import { notFound } from "next/navigation";
import { devPagesEnabled } from "../../lib/env";

/**
 * Gate for the dev-only scratch routes under /demo (the static table mock, the
 * component gallery, and the per-component /demo/part/[c] frames). These exist
 * purely for design review, so in production the whole subtree 404s. Toggle via
 * NEXT_PUBLIC_APP_ENV — see src/lib/env.ts.
 */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  if (!devPagesEnabled) notFound();
  return <>{children}</>;
}
