-- One-time admin setup: only a SHA-256 hash of the code is stored. The code
-- stops working as soon as the first admin exists.
insert into public.app_settings (key, value)
values ('admin_setup_hash', '"a61f7bdb5e1dac6c5266e397f48a3a51814d0e27eb73b59fc79dbdfd16338522"'::jsonb)
on conflict (key) do nothing;
