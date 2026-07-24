-- Add Lloyd Harbor School to Cold Spring Harbor CSD

insert into schools (district_id, name)
select id, 'Lloyd Harbor School'
from districts
where name = 'Cold Spring Harbor Central School District'
limit 1;
