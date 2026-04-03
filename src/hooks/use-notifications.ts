import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';
import type { Notification } from '../types/database';

/** Fetch activity from audit_log (the actual source of truth) */
export function useActivityFeed() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['activity', userId],
    queryFn: async () => {
      if (!userId) return [];

      // First get the user's group IDs
      const { data: memberRows, error: memErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memErr) throw memErr;
      const groupIds = memberRows?.map((r) => r.group_id) ?? [];
      if (groupIds.length === 0) return [];

      // Fetch audit log entries for all groups the user is in
      const { data, error } = await supabase
        .from('audit_log')
        .select(`
          *,
          modifier:profiles!modified_by(id, full_name, avatar_url),
          group:groups!group_id(name)
        `)
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function useNotifications() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as Notification[]) ?? [];
    },
    enabled: !!userId,
  });
}

export function useUnreadCount() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['notifications', 'unread', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId!)
        .eq('is_read', false);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
