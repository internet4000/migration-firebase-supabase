# migration

node js scripts to migrate the r4 firebase (realtime json) instance to
supabase (postgresql).


# How to

## `.env`

See `.env-example` for what to put in the `.env` file.

## The datbase

- in firebase realtime root, "export json" and save it to this project's `./input/database.json`.
> console.firebase.google.com/project/<project-name>/database/<database-name>/data
- todo: script making a convertion json to sql

## The users

To migrate the users and passwords:

- install firebase-cli to be able to login your firebase account
- user the firebase cli export user command
- save this json file to `./input/users.json`
- in the cli (or web interface), get the password hash parameters,
  save this data in `./input/hash.json`
- todo: write script that makes a convertion/import to postgresql (supabase)
