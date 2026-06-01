import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Bill, Payment } from "./bills";

export const billsQuery = queryOptions({
  queryKey: ["bills"],
  queryFn: async (): Promise<Bill[]> => {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("is_archived", false)
      .order("due_date", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const paymentsQuery = queryOptions({
  queryKey: ["payments"],
  queryFn: async (): Promise<Payment[]> => {
    const { data, error } = await supabase
      .from("bill_payments")
      .select("*")
      .order("paid_on", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});
