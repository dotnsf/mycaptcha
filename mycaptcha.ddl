/* mycaptcha.ddl */

/* apikeys */
drop table apikeys;
create table if not exists apikeys ( id varchar(50) not null primary key, username varchar(50) not null, origin varchar(50) not null, sitename varchar(50) not null, created bigint default 0, updated bigint default 0 );

/* captchas */
drop table captchas;
create table if not exists captchas ( id varchar(50) not null primary key, apikey varchar(50) not null, question varchar(256) default '', answer varchar(256) default '', code varchar(50) default '', created bigint default 0, updated bigint default 0 );
