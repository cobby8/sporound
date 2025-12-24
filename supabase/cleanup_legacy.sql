-- Clean up legacy data for specific team
delete from public.reservations 
where team_name = '코웨이 블루휠즈' 
   or team_name like '%Coway%' 
   or guest_name like '%코웨이%';
