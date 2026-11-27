-- Per-user development targets: how much of each trait the user wants to build.
-- Feeds story / assessment / session generation so content pushes toward the gaps.
alter table profiles add column if not exists skill_targets jsonb;
alter table profiles add column if not exists target_preset text;
