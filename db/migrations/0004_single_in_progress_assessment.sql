-- Fix: quick concurrent answers could each create a separate in-progress
-- assessment, splitting a user's answers. Merge any duplicates into the
-- earliest one (keeping the newest answer per question), then enforce one
-- in-progress baseline assessment per user.
create temporary table _dup_assessments on commit drop as
select id,
       first_value(id) over (partition by user_id order by started_at, id) as keep_id,
       row_number() over (partition by user_id order by started_at, id) as rn
from public.assessments
where status = 'in_progress' and kind = 'baseline';

insert into public.assessment_responses (assessment_id, user_id, question_id, dimension, value, created_at)
select d.keep_id, r.user_id, r.question_id, r.dimension, r.value, r.created_at
from public.assessment_responses r
join _dup_assessments d on d.id = r.assessment_id
where d.rn > 1
on conflict (assessment_id, question_id) do update
  set value = excluded.value, created_at = excluded.created_at
  where excluded.created_at > public.assessment_responses.created_at;

delete from public.assessments a using _dup_assessments d where a.id = d.id and d.rn > 1;

create unique index if not exists assessments_one_in_progress_baseline
  on public.assessments (user_id) where status = 'in_progress' and kind = 'baseline';
