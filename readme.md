# migration

node js scripts to migrate the r4 firebase (realtime json) instance to supabase (postgresql).

# How to

## The firebase database

- in firebase realtime root, "export json" and save it to this project's `./input/database.json`.

```
npm install
npm run firebase-login
npm run firebase-export
```

## The postgres database

See `.env-example` for what to put in the `.env` file.
For Supabase, go to settings/database to see the connection info.

## The actual migration

- todo: script making a convertion json to sql

```
cat input/database.json | jq '.channels | map({name: .title, slug: .slug, description: .body, updated_at: .updated, created_at: .created})'
```

## The users

To migrate the users and passwords:

- install firebase-cli to be able to login your firebase account
- user the firebase cli export user command
- save this json file to `./input/users.json`
- in the cli (or web interface), get the password hash parameters,
  save this data in `./input/hash.json`
- todo: write script that makes a convertion/import to postgresql (supabase)
