-- A1 added `learning_steps` to the engine's FsrsState so Learning-state cards
-- preserve their step counter across sessions. Mirror that field in the
-- per-user scheduling table.
alter table public.card_progress
  add column learning_steps integer not null default 0;
