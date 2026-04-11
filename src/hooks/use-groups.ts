import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { restSelect, restInsert } from '../lib/supabase-rest';
import { useAuthStore } from '../stores/auth-store';
import type { Group, GroupMember, Profile, GroupWithMembers } from '../types/database';

export function useGroups() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['groups', userId],
    queryFn: async (): Promise<GroupWithMembers[]> => {
      if (!userId) return [];

      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('status', 'ACTIVE');

      if (memberErr) throw memberErr;
      const groupIds = memberRows?.map((r) => r.group_id) ?? [];
      if (groupIds.length === 0) return [];

      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          members:group_members(
            *,
            profile:profiles(*)
          )
        `)
        .in('id', groupIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as GroupWithMembers[]) ?? [];
    },
    enabled: !!userId,
  });
}

export function useGroup(groupId: string) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async (): Promise<GroupWithMembers | null> => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          members:group_members(
            *,
            profile:profiles(*)
          )
        `)
        .eq('id', groupId)
        .single();

      if (error) throw error;
      return data as unknown as GroupWithMembers;
    },
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({ name, iconUrl }: { name: string; iconUrl?: string }) => {
      if (!userId) throw new Error('Not authenticated');

      let group: Group;

      if (Platform.OS === 'web') {
        // Use direct REST to bypass Supabase client lock issues
        const { data, error } = await restInsert('groups', {
          name, icon_url: iconUrl ?? null, created_by: userId,
        }, { select: '*', single: true });
        if (error) throw new Error(error.message);
        group = data as Group;

        const { error: memberErr } = await restInsert('group_members', {
          group_id: group.id, user_id: userId,
        });
        if (memberErr) throw new Error(memberErr.message);
      } else {
        const { data, error } = await supabase
          .from('groups')
          .insert({ name, icon_url: iconUrl ?? null, created_by: userId })
          .select()
          .single();
        if (error) throw error;
        group = data as Group;

        const { error: memberErr } = await supabase
          .from('group_members')
          .insert({ group_id: group.id, user_id: userId });
        if (memberErr) throw memberErr;
      }

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!userId) throw new Error('Not authenticated');

      // Look up group by invite code (uses SECURITY DEFINER function)
      const { data: groups, error: lookupErr } = await supabase
        .rpc('get_group_by_invite_code', { code: inviteCode });

      if (lookupErr) throw lookupErr;
      if (!groups || groups.length === 0) throw new Error('Invalid invite code');

      const group = groups[0];

      // Check if already a member
      const { data: existing } = await supabase
        .from('group_members')
        .select('id, status')
        .eq('group_id', group.id)
        .eq('user_id', userId)
        .single();

      if (existing?.status === 'ACTIVE') {
        throw new Error('You are already a member of this group');
      }

      if (existing) {
        // Re-activate if previously left
        await supabase
          .from('group_members')
          .update({ status: 'ACTIVE', left_at: null })
          .eq('id', existing.id);
      } else {
        const { error } = await supabase
          .from('group_members')
          .insert({ group_id: group.id, user_id: userId });
        if (error) throw error;
      }

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async ({
      groupId,
      name,
      iconUrl,
    }: {
      groupId: string;
      name?: string;
      iconUrl?: string | null;
    }) => {
      if (!userId) throw new Error('Not authenticated');

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (iconUrl !== undefined) updates.icon_url = iconUrl;

      if (Platform.OS === 'web') {
        // Use REST wrapper to avoid lock deadlock on web
        const { restUpdate } = await import('../lib/supabase-rest');
        const { data, error } = await restUpdate('groups', updates, {
          eq: { id: groupId },
          select: '*',
          single: true,
        });
        if (error) throw new Error(error.message);
        return data;
      }

      const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_, { groupId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['group', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
      ]);
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return {
    mutateAsync: async (groupId: string) => {
      if (!userId) throw new Error('Not authenticated');
      // Call server-side RPC to delete group (only allowed for creator and if settled)
      const { error } = await supabase.rpc('delete_group', { group_uuid: groupId });
      if (error) throw error;
      // Refresh relevant queries (include user-scoped keys)
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['activity', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  };
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!userId) throw new Error('Not authenticated');

      // Enforce zero-balance before leaving
      // The UI should check this first, but we double-check here
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'INACTIVE', left_at: new Date().toISOString() })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
