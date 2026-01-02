
-- Create a function to delete users (single or multiple)
-- This function allows deleting users from auth.users, which will cascade to profiles if configured,
-- or we manually delete from profiles to be sure.
-- Also cleans up related tables that might not have ON DELETE CASCADE

CREATE OR REPLACE FUNCTION public.delete_users(target_user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Delete from related tables that might not have CASCADE
  DELETE FROM public.user_feature_states WHERE user_id = ANY(target_user_ids);
  DELETE FROM public.app_requests WHERE user_id = ANY(target_user_ids);
  DELETE FROM public.inventory_sessions WHERE user_id = ANY(target_user_ids);
  
  -- Delete from profiles (has CASCADE usually, but explicit is safe)
  DELETE FROM public.profiles WHERE user_id = ANY(target_user_ids);
  
  -- Delete from auth.users (triggers CASCADE for vehicles, phone_numbers, etc. if configured)
  DELETE FROM auth.users WHERE id = ANY(target_user_ids);
END;
$$;
