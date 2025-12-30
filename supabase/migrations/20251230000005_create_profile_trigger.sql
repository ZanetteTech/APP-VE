-- Create a function to handle new user signup
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
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
