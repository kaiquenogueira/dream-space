alter table storage.objects enable row level security;

insert into storage.buckets (id, name, public)
values
  ('originals', 'originals', false),
  ('generations', 'generations', false)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public;

drop policy if exists "Users can upload originals" on storage.objects;
drop policy if exists "Users can read own originals" on storage.objects;
drop policy if exists "Users can update own originals" on storage.objects;
drop policy if exists "Users can delete own originals" on storage.objects;
drop policy if exists "Users can upload generations" on storage.objects;
drop policy if exists "Users can read own generations" on storage.objects;
drop policy if exists "Users can update own generations" on storage.objects;
drop policy if exists "Users can delete own generations" on storage.objects;

create policy "Users can upload originals"
on storage.objects for insert
with check (
  bucket_id = 'originals'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can read own originals"
on storage.objects for select
using (
  bucket_id = 'originals'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own originals"
on storage.objects for update
using (
  bucket_id = 'originals'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'originals'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own originals"
on storage.objects for delete
using (
  bucket_id = 'originals'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can upload generations"
on storage.objects for insert
with check (
  bucket_id = 'generations'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can read own generations"
on storage.objects for select
using (
  bucket_id = 'generations'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own generations"
on storage.objects for update
using (
  bucket_id = 'generations'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'generations'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own generations"
on storage.objects for delete
using (
  bucket_id = 'generations'
  and auth.uid()::text = (storage.foldername(name))[1]
);
