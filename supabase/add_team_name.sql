alter table reservations add column if not exists team_name text;

comment on column reservations.team_name is '예약 시 입력하는 단체명 또는 팀명';
