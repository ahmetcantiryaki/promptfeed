# PromptFeed — AI İçerik Keşif Platformu

## Proje
Sosyal medyada (Twitter, Reddit, Instagram, YouTube, TikTok) paylaşılan 
AI üretimi görsel ve video içerikleri, üretildikleri prompt ile yan yana 
gösteren bir keşif platformu. Kullanıcı bir içeriği gördüğü anda, onu 
üreten prompt'u da aynı akışta görür — detay sayfasına girmeye gerek kalmaz.

## Referans Materyaller
- `BRIEF.md` — tam ürün briefi (oku)
- `reference-mockup.html` — hi-fi HTML mockup (görsel yön için referans, birebir kopyalama)
- `reference-screenshot.png` — orijinal tasarım referansı

Başlamadan önce bu üç dosyayı oku ve bana:
1. Anladığın ürünü 3 cümleyle özetle
2. Önerdiğin tech stack'i ve sebebini yaz
3. İlk sprint'te ne yapacağını bullet'la

Onayımı aldıktan sonra kodlamaya başla.

## Tech Stack
- **Frontend:** Next.js 15 (App Router) + TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **DB + Storage + Auth:** Supabase (Postgres + Storage buckets)
- **ORM:** Drizzle ORM (Supabase Postgres'e bağlı) 
  — veya Supabase client'ını direkt kullan, hangisi daha temizse öner çünkü supabase mcpye sahipiz 
- **Scraper:** Node.js CLI, ayrı `/scraper` klasöründe, Supabase'e yazar
- Alternatif önerin varsa söyle

## Supabase Kurulumu
- `.env.local` içinde: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, 
  `SUPABASE_SERVICE_ROLE_KEY` (sadece server-side, scraper için)
- Server Components'te `createServerClient`, Client Components'te `createBrowserClient` kullan
- Service role key'i ASLA client'a sızdırma
- RLS (Row Level Security) politikaları:
  - `posts` tablosu: public read, authenticated write
  - Scraper service role ile yazar, RLS bypass eder
- Storage buckets:
  - `media` bucket — public read, upload sadece service role
  - Scraper medyayı indirip buraya upload eder, url'i post'a yazar

## Scraper Kuralları
- `/scraper` ayrı bir Node.js projesi (kendi package.json'u)
- `.env` dosyası `/scraper/.env` — service role key SADECE burada
- Scraper Supabase'e yazarken service role ile bağlanır (RLS bypass)
- Medya: scraper önce dosyayı indirir, sonra Supabase Storage'a upload eder, 
  public URL'i posts tablosuna yazar
- Duplicate kontrol: `source_url` unique constraint, upsert kullan
- Rate limit: her kaynağa max 10 req/dakika

## Kapsam — MVP
1. **Dashboard sayfası** (`/`) — reference-mockup.html'deki layout
   - Sol sidebar: nav + Models + Platforms (sayı rozetli)
   - Üst bar: search + For You/Following tabs + dropdown filtreler + grid size selector + dark mode toggle
   - İçerik grid: 2/3/4/5 kolon seçilebilir
   - Kart: media (görsel/video) + user meta + Model label + Prompt (4 satır clamp) + etkileşim barı
2. **Veri modeli**
   - `Post`: id, media_url, media_type (image/video), prompt, model, platform, source_user, source_url, likes, comments, shares, created_at
   - `Model`: name, slug, icon
   - `Platform`: name, slug, icon
3. **Mock API** — `/api/posts` endpoint, filtre/sıralama query params'ları destekler
4. **Dark/light mode** — kalıcı (localStorage)
5. **Grid size** — kalıcı (localStorage)

## Kapsam dışı (şimdilik)
- Authentication (Sign in butonu placeholder)
- Gerçek scraping (seed data ile başlayalım — 50 mock post JSON'da)
- Detay sayfası
- Following/For You algoritması

## Görsel Dil
- Nötr palet: siyah/beyaz/gri. Accent renk YOK şimdilik — AI görselleri kartlarda öne çıksın
- Tipografi: system font stack
- Prompt metni kartın en baskın metni olmalı, meta bilgiler (model, user, platform) daha düşük kontrastla
- Border radius: 10px (cards), 6px (buttons)
- `reference-mockup.html`'deki CSS variable'lara sadık kal

## Çalışma Şekli
- Her feature'dan sonra bana `npm run dev` output'unu göster, ekran görüntüsü al
- Component'leri küçük tut, tek dosyada 200 satırdan fazla olmasın
- Data fetching için server components kullan, interaktivite için client components
- Her commit küçük ve odaklı olsun

## Başla
Önce yukarıdaki 3 maddeyi (özet + stack + sprint planı) ver. Kod yazma.