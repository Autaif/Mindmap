-- Supabase setup for the mindmap web app.
--
-- Run this whole file in the SQL Editor of a fresh project. It is idempotent:
-- re-running it is safe and is the way to repair a project whose policies have
-- drifted. Everything the deployed app needs is here — tables, row-level
-- policies, one function, the storage bucket and the realtime publication.
--
-- WHY THIS FILE EXISTS: the app talks to Supabase straight from the browser,
-- with no server of its own. That means the *only* thing standing between one
-- account and another's entries is the policies below. They are the security
-- boundary, not the client code, and they are worth reading before trusting the
-- app with anything real.
--
-- After running it, create the two accounts under Authentication → Users, and
-- put their emails in `artifacts/quiet-mindmap/src/lib/people.ts`.

-- ---------------------------------------------------------------- tables ----

-- Entries. `id` is client-generated so an entry created offline keeps a stable
-- identity when it syncs. `updated_at` is client-supplied and drives
-- last-write-wins. `shared_with` is what makes an entry visible to a second
-- person: one row both of them read, never two copies that can drift apart.
create table if not exists nodes (
  id          text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  shared_with uuid references auth.users on delete set null,
  title       text not null,
  detail      text not null default '',
  kind        text not null,
  owner       text not null default '',
  status      text not null default 'open',
  parent_id   text,
  created_at  timestamptz not null,
  updated_at  timestamptz not null
);

-- Position is per person, not per entry: the same shared entry sits wherever
-- each of them dragged it, because each map is arranged by its own owner.
create table if not exists node_positions (
  node_id text not null references nodes on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  x       integer not null,
  y       integer not null,
  primary key (node_id, user_id)
);

-- Attachment metadata. Bytes live in Storage (`storage_path`) for uploads, or
-- are served by the app itself (`asset_url`) for the seeded demo documents, or
-- are simply a link (`url`).
create table if not exists attachments (
  id           text primary key,
  node_id      text not null references nodes on delete cascade,
  kind         text not null,
  name         text not null,
  mime_type    text,
  size         bigint,
  url          text,
  asset_url    text,
  storage_path text,
  uploaded_by  uuid not null references auth.users on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists nodes_user_id_idx     on nodes (user_id);
create index if not exists nodes_shared_with_idx on nodes (shared_with);
create index if not exists attachments_node_idx  on attachments (node_id);

-- ------------------------------------------------------------- policies -----

alter table nodes          enable row level security;
alter table node_positions enable row level security;
alter table attachments    enable row level security;

-- Entries -------------------------------------------------------------------

drop policy if exists "see mine and what's shared with me"  on nodes;
drop policy if exists "edit mine and what's shared with me" on nodes;
drop policy if exists "create my own"                       on nodes;
drop policy if exists "delete my own"                       on nodes;

create policy "see mine and what's shared with me" on nodes
  for select to authenticated
  using (auth.uid() = user_id or auth.uid() = shared_with);

-- Both parties may edit a shared entry — that is the point of it being one
-- record. Conflicting edits are settled by last-write-wins on `updated_at`.
create policy "edit mine and what's shared with me" on nodes
  for update to authenticated
  using (auth.uid() = user_id or auth.uid() = shared_with);

create policy "create my own" on nodes
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Only the owner may delete. Otherwise the recipient tidying their own map
-- would silently remove the sender's record of the same concern.
create policy "delete my own" on nodes
  for delete to authenticated
  using (auth.uid() = user_id);

-- Positions -----------------------------------------------------------------

drop policy if exists "my own positions" on node_positions;

create policy "my own positions" on node_positions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Attachments ---------------------------------------------------------------
-- Visible exactly when the entry they belong to is visible. Deriving it from
-- the entry means there is no second sharing rule to keep in step with the
-- first — a picture travels with a shared entry by construction.

drop policy if exists "see attachments on visible entries" on attachments;
drop policy if exists "attach to visible entries"          on attachments;
drop policy if exists "update my attachments"              on attachments;
drop policy if exists "remove my attachments"              on attachments;

create policy "see attachments on visible entries" on attachments
  for select to authenticated
  using (exists (
    select 1 from nodes n
    where n.id = attachments.node_id
      and (auth.uid() = n.user_id or auth.uid() = n.shared_with)));

create policy "attach to visible entries" on attachments
  for insert to authenticated
  with check (
    auth.uid() = uploaded_by
    and exists (
      select 1 from nodes n
      where n.id = attachments.node_id
        and (auth.uid() = n.user_id or auth.uid() = n.shared_with)));

create policy "update my attachments" on attachments
  for update to authenticated
  using (auth.uid() = uploaded_by);

create policy "remove my attachments" on attachments
  for delete to authenticated
  using (auth.uid() = uploaded_by);

-- ------------------------------------------------------------- function -----

-- Handing an entry back, called by the RECIPIENT.
--
-- This cannot be a plain update. The row policy re-checks the row after the
-- change, and a row that is no longer shared with you satisfies neither arm of
-- it — so the recipient clearing the column is refused. Running as the definer
-- sidesteps that, and the `shared_with = auth.uid()` clause below is what keeps
-- it honest: it can only ever release a row from the person actually holding it.
create or replace function return_shared_node(p_node_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update nodes
     set shared_with = null,
         updated_at  = now()
   where id = p_node_id
     and shared_with = auth.uid();

  if not found then
    raise exception 'Not yours to return';
  end if;
end;
$$;

revoke all     on function return_shared_node(text) from public;
grant  execute on function return_shared_node(text) to authenticated;

-- -------------------------------------------------------------- storage -----

-- Private bucket: files are read through short-lived signed URLs, never by
-- public URL.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists "upload own attachments"              on storage.objects;
drop policy if exists "replace own attachments"             on storage.objects;
drop policy if exists "delete own attachments"              on storage.objects;
drop policy if exists "read attachments on visible entries" on storage.objects;

-- The client writes to `<user id>/<attachment id>-<filename>`, so a plain
-- prefix match is the whole rule. Expressed with `like` rather than
-- storage.foldername() to avoid depending on how that splits a path.
create policy "upload own attachments" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and name like auth.uid()::text || '/%');

create policy "replace own attachments" on storage.objects
  for update to authenticated
  using (bucket_id = 'attachments' and name like auth.uid()::text || '/%');

create policy "delete own attachments" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and name like auth.uid()::text || '/%');

-- The first arm is load-bearing and was learned the hard way. Without it this
-- policy is circular: it would authorise reading a file only once an
-- `attachments` row points at it, but that row is written AFTER the upload —
-- so any lookup during upload is refused and the upload fails with a bare 400.
-- Your own files are always readable; the second arm is what lets the other
-- person read a file, through the entry it belongs to.
create policy "read attachments on visible entries" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and (
      name like auth.uid()::text || '/%'
      or exists (
        select 1 from attachments a
        join nodes n on n.id = a.node_id
        where a.storage_path = storage.objects.name
          and (auth.uid() = n.user_id or auth.uid() = n.shared_with))));

-- ------------------------------------------------------------- realtime -----

-- What makes a sent entry appear on the other person's screen without a
-- reload. Guarded because adding a table twice is an error.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'nodes'
  ) then
    alter publication supabase_realtime add table nodes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attachments'
  ) then
    alter publication supabase_realtime add table attachments;
  end if;
end $$;

-- ----------------------------------------------------------------- check ----
-- Expect: 4 node policies, 1 position policy, 4 attachment policies,
--         4 storage policies, 1 bucket, 1 function.
select
  (select count(*) from pg_policies where tablename = 'nodes')          as node_policies,
  (select count(*) from pg_policies where tablename = 'node_positions') as position_policies,
  (select count(*) from pg_policies where tablename = 'attachments')    as attachment_policies,
  (select count(*) from pg_policies
     where schemaname = 'storage' and tablename = 'objects')            as storage_policies,
  (select count(*) from storage.buckets where id = 'attachments')       as bucket,
  (select count(*) from pg_proc where proname = 'return_shared_node')   as return_function;
