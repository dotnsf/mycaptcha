# MyCaptcha

## Environment values

- `DATABASE_URL` : URL connection string for PostgreSQL

- `APIKEY` : API Key


## How to run Postgres in Docker(as DB server)

- `$ docker run --name mycaptchadb -e POSTGRES_USER=user1 -e POSTGRES_PASSWORD=pass1 -e POSTGRES_DB=mycaptcha -p 5432:5432 -d postgres`

- `$ docker exec -it mycaptchadb bash`

- `/# psql "postgres://user1:pass1@localhost:5432/mycaptcha"`

- `mycaptcha=# create table if not exists apikeys ( id varchar(50) not null primary key, username varchar(50) not null, origin varchar(50) not null, sitename varchar(50) not null, created bigint default 0, updated bigint default 0 );`

- `mycaptcha=# create table if not exists captchas ( id varchar(50) not null primary key, apikey varchar(50) not null, question varchar(256) default '', answer varchar(256) default '', code varchar(50) default '', created bigint default 0, updated bigint default 0 );`

- `mycaptcha=# insert into apikeys( id, username, origin, sitename ) values ( 'apikey-for-test', 'dotnsf@gmail.com', 'http://localhost:8080', 'テストサイト' );`

- `mycaptcha=# \q`

- `/# exit`


## Licensing

This code is licensed under MIT.


## Copyright

2023 K.Kimura @ Juge.Me all rights reserved.

