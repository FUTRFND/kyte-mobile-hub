import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Bill, Payment } from "./bills";

export type Income = Database["public"]["Tables"]["incomes"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Account = Database["public"]["Tables"]["accounts"]["Row"];

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

export const incomesQuery = queryOptions({
  queryKey: ["incomes"],
  queryFn: async (): Promise<Income[]> => {
    const { data, error } = await supabase
      .from("incomes")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const transactionsQuery = queryOptions({
  queryKey: ["transactions"],
  queryFn: async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("occurred_on", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async (): Promise<Profile | null> => {
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

export const accountsQuery = queryOptions({
  queryKey: ["accounts"],
  queryFn: async (): Promise<Account[]> => {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("linked_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});
