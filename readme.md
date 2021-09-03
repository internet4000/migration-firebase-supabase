# migration

node js scripts to migrate the r4 firebase (realtime json) instance to supabase (postgresql).

# How to

## Input Firebase Realtime Database

We export the Firebase database and users with the CLI.  This will add `./input/database.json` and `./input/auth-users.json`.

```
npm install
npm run firebase-login
npm run export-firebase-database
npm run export-firebase-users
```

## Output PostgreSQL database

Copy `.env-example` to `.env` and fill out the variables from a Supabase project's settings -> database page.

## The actual migration

Run this

```
node .
```

## How to migrate password users

To migrate the users and passwords:

- todo: in the cli (or web interface), get the password hash parameters, save this data in `./input/hash.json`
- todo: write script that makes a convertion/import to postgresql (supabase)

## Notes

Flattens channels
```
cat input/database.json | jq '.channels | to_entries | map({id: .key, name: .value.title, slug: .value.slug, created_at: .value.created, updated_at: .value.updated, image: .value.image, url: .value.link})' > input/channels.json
```

Flattens tracks
```
cat input/database.json | jq '.tracks | to_entries | map({id: .key, url: .value.url, title: .value.title, created_at: .value.created})' > input/tracks.json
```
