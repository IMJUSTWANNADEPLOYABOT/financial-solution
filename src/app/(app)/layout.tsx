import { AppShell } from "@/components/app-shell";
import { TransactionSheetProvider } from "@/components/transaction-sheet";
import { requireUser } from "@/lib/auth";
import { getCategories } from "@/lib/queries";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const categories = getCategories(user.id);

  return (
    <TransactionSheetProvider categories={categories} timezone={user.timezone}>
      <AppShell username={user.username}>{children}</AppShell>
    </TransactionSheetProvider>
  );
}
