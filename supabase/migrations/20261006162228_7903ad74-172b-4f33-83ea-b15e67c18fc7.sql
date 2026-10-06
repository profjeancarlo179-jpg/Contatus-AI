CREATE TABLE public.payment_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  logo text,
  instructions text NOT NULL DEFAULT '',
  pix_code text NOT NULL DEFAULT '',
  footer text NOT NULL DEFAULT 'Documento gerado automaticamente pelo Contatus AI.',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read payment settings" ON public.payment_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "master insert payment settings" ON public.payment_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'master'));
CREATE POLICY "master update payment settings" ON public.payment_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));
INSERT INTO public.payment_settings (id, company_name, address, phone, whatsapp, email, website, instructions, pix_code) VALUES (1,
'JC SOLUÇÕES EM TECNOLOGIA E INFORMÁTICA', 'Rua Cecília Meireles, Vila Irene — Cáceres — MT — 78200-000', '65996256092', '(65) 99625-6092', 'marketingdigital28179@gmail.com', 'https://www.facebook.com/jcsolucoesemtecnologia/',
'O código QR do PIX está em NOME: JEAN CARLO SILVA DOS SANTOS
BANCO: INTER - CHAVE PIX CPF 014.300.721-13
Após o pagamento, favor encaminhar o comprovante para o WhatsApp: (65) 99633-6618 para baixa manual no sistema. OBRIGADO!',
'00020101021126330014br.gov.bcb.pix0111014300721135204000053039865802BR5911JEAN SANTOS6007CACERES62070503***6304E695');