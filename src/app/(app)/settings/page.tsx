import type { Metadata } from "next";

import {
  ChangePasswordForm,
  SessionButtons,
  TimezoneSelect,
} from "@/components/settings/account-section";
import { BudgetsForm } from "@/components/settings/budgets-form";
import { CategoryManager } from "@/components/settings/category-manager";
import { ThemeSwitcher } from "@/components/settings/theme-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getBudgets, getCategories } from "@/lib/queries";

export const metadata: Metadata = { title: "Настройки" };

function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20 gap-4 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const categories = getCategories(user.id);
  const budgets = getBudgets(user.id);

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="grid gap-5">
          <Section title="Оформление">
            <ThemeSwitcher />
          </Section>

          <Section
            id="budgets"
            title="Лимиты"
            description="Сколько планируешь тратить за календарный месяц. Пустое поле — без лимита."
          >
            <BudgetsForm budgets={budgets} categories={categories} />
          </Section>
        </div>

        <div className="grid gap-5">
          <Section title="Категории" description="Нажми на категорию, чтобы изменить её.">
            <CategoryManager categories={categories} />
          </Section>

          <Section title="Часовой пояс" description="Определяет, какой день считается «сегодня».">
            <TimezoneSelect value={user.timezone} />
          </Section>

          <Section title="Аккаунт" description={`Вход выполнен как @${user.username}`}>
            <div className="grid gap-6">
              <ChangePasswordForm />
              <SessionButtons />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
