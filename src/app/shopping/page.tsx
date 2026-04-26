import { PageHeader } from "@/components/page-header";
import { ShoppingView } from "@/components/shopping-view";

export const dynamic = "force-dynamic";

export default function ShoppingPage() {
  return (
    <>
      <PageHeader title="Liste de courses" />
      <ShoppingView />
    </>
  );
}
