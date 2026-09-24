-- Seller view counts on marketplace listings.
-- view_count is incremented through a SECURITY DEFINER RPC so the POST endpoint
-- can record anonymous views without exposing the table to direct writes.
-- NOTE: run this against the live database; the repo does not currently hold the full schema.

alter table public.marketplace_listings
  add column if not exists view_count integer not null default 0;

create or replace function public.increment_listing_views(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.marketplace_listings
  set view_count = view_count + 1
  where id = p_listing_id;
end;
$$;
