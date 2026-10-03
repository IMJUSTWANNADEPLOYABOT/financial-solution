"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Loader2, LogOut, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";

import { changePassword, logout, logoutEverywhere, type AuthState } from "@/actions/auth";
import { saveTimezone } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEZONES = [
  "Europe/Kaliningrad",
  "Europe/Moscow",
  "Europe/Samara",
  "Asia/Yekaterinburg",
  "Asia/Omsk",
  "Asia/Novosibirsk",
  "Asia/Krasnoyarsk",
  "Asia/Irkutsk",
  "Asia/Yakutsk",
  "Asia/Vladivostok",
  "Asia/Magadan",
  "Asia/Kamchatka",
  "Asia/Almaty",
  "Asia/Tashkent",
  "Europe/Minsk",
  "Europe/Kyiv",
  "Asia/Tbilisi",
  "Asia/Yerevan",
  "Europe/Berlin",
  "Europe/London",
  "UTC",
];

function offsetLabel(tz: string) {
  const part = new Intl.DateTimeFormat("ru-RU", { timeZone: tz, timeZoneName: "shortOffset" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value;
  return part?.replace("GMT", "UTC") ?? "";
}

export function TimezoneSelect({ value }: { value: string }) {
  const [pending, startTransition] = useTransition();
  const options = TIMEZONES.includes(value) ? TIMEZONES : [value, ...TIMEZONES];

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        disabled={pending}
        onValueChange={(tz) =>
          startTransition(async () => {
            const result = await saveTimezone(tz);
            if (result.ok) toast.success("Часовой пояс сохранён");
            else toast.error(result.error);
          })
        }
      >
        <SelectTrigger className="h-10! w-full sm:w-80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((tz) => (
            <SelectItem key={tz} value={tz}>
              {tz.replace("_", " ")}{" "}
              <span className="text-muted-foreground">{offsetLabel(tz)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<AuthState>(null);

  useEffect(() => {
    if (!state || state === handled.current) return;
    handled.current = state;
    if (state.ok) {
      toast.success("Пароль изменён");
      formRef.current?.reset();
    }
  }, [state]);

  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:max-w-sm">
      <div className="grid gap-2">
        <Label htmlFor="current">Текущий пароль</Label>
        <Input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          className="h-10"
          aria-invalid={!!errors?.current}
        />
        {errors?.current && <p className="text-sm text-destructive">{errors.current}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="next">Новый пароль</Label>
        <Input
          id="next"
          name="next"
          type="password"
          autoComplete="new-password"
          className="h-10"
          aria-invalid={!!errors?.next}
        />
        {errors?.next && <p className="text-sm text-destructive">{errors.next}</p>}
      </div>
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="h-10 justify-self-start"
      >
        {pending && <Loader2 className="animate-spin" />}
        Сменить пароль
      </Button>
    </form>
  );
}

export function SessionButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={logout}>
        <Button type="submit" variant="outline" className="h-10">
          <LogOut />
          Выйти
        </Button>
      </form>
      <form action={logoutEverywhere}>
        <Button type="submit" variant="destructive" className="h-10">
          <MonitorSmartphone />
          Выйти на всех устройствах
        </Button>
      </form>
    </div>
  );
}
