-- Add Cold Spring Harbor CSD and St. Patrick's School
-- Run in Supabase SQL Editor

do $$
declare
  d_csh uuid;
  d_huntington uuid;
begin

  -- Cold Spring Harbor Central School District (new)
  insert into districts (name) values ('Cold Spring Harbor Central School District') returning id into d_csh;

  insert into schools (district_id, name) values
    (d_csh, 'Cold Spring Harbor High School'),
    (d_csh, 'Cold Spring Harbor Middle School'),
    (d_csh, 'Goosehill Primary School'),
    (d_csh, 'West Side School');

  -- St. Patrick's School — independent, nested under Huntington UFSD
  select id into d_huntington from districts where name = 'Huntington Union Free School District' limit 1;

  insert into schools (district_id, name) values
    (d_huntington, 'St. Patrick''s School (Huntington)');

end $$;
