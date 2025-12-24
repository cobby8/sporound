-- 사용자 이메일로 관리자 권한 부여하기
-- 아래 'your_email@example.com'을 관리자로 만들고 싶은 사용자의 이메일로 바꾸세요.

update public.profiles
set role = 'admin'
where email = 'your_email@example.com';

-- 확인용 쿼리
select * from public.profiles where role = 'admin';
