# migration

node js scripts to migrate the r4 firebase (realtime json) instance to supabase (postgresql).

# How to

## The firebase database

- in firebase realtime root, "export json" and save it to this project's `./input/database.json`.

```
npm install
npm run firebase-login
npm run export-firebase
```

## The postgres database

See `.env-example` for what to put in the `.env` file.
For Supabase, go to settings/database to see the connection info.

## The actual migration

- todo: script making a convertion json to sql

Flattens channels
```
cat input/database.json | jq '.channels | to_entries | map({id: .key, name: .value.title, slug: .value.slug, created_at: .value.created, updated_at: .value.updated, image: .value.image, url: .value.link})' > input/channels.json
```

Flattens tracks
```
cat input/database.json | jq '.tracks | to_entries | map({id: .key, url: .value.url, title: .value.title, created_at: .value.created})' > input/tracks.json
```


## The users

To migrate the users and passwords:

- npm run firebase-login
- npm run export-firebase-users
- in the cli (or web interface), get the password hash parameters, save this data in `./input/hash.json`
- todo: write script that makes a convertion/import to postgresql (supabase)
