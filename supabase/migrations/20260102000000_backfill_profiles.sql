
-- Backfill profiles from auth.users for existing users who don't have a profile
INSERT INTO public.profiles (user_id, matricula, name, loja, role)
SELECT 
  id, 
  raw_user_meta_data->>'matricula',
  raw_user_meta_data->>'name',
  raw_user_meta_data->>'loja',
  COALESCE(raw_user_meta_data->>'role', 'CADASTRO')
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles);

-- Ensure the trigger is definitely working for future users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, matricula, name, loja, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'matricula',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'loja',
    COALESCE(new.raw_user_meta_data->>'role', 'CADASTRO')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    matricula = EXCLUDED.matricula,
    name = EXCLUDED.name,
    loja = EXCLUDED.loja,
    role = EXCLUDED.role;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger just to be safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
