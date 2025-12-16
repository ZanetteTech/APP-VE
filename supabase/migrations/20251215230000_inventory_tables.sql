CREATE TABLE IF NOT EXISTS public.inventory_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_vehicles INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed'
);

ALTER TABLE public.inventory_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory sessions" ON public.inventory_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory sessions" ON public.inventory_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.inventory_sessions(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  placa TEXT NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory items" ON public.inventory_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inventory_sessions
      WHERE id = inventory_items.session_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own inventory items" ON public.inventory_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventory_sessions
      WHERE id = session_id
      AND user_id = auth.uid()
    )
  );
