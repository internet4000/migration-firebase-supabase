# migration

INPUT Radio4000 Firebase (realtime database) instance
OUTPUT instance of Supabase (PostgreSQL).

This repo contains node scripts to migrate the Radio4000 database: users, channels and tracks.

# How to

## Input Firebase database

We export the Firebase database and users with the CLI.
This will add two files: `./input/database.json` and `./input/auth-users.json`.

```
npm install
npm run firebase-login
npm run export
```

## Output PostgreSQL database

Copy `.env-example` to `.env` and fill out the variables from a Supabase project's settings -> database page.

## The actual migration

IMPORTANT: This will migrate every auth user in the Firebase database along with any channel and track data.

> If you only want to migrate certain users, uncomment and use the `whitelist` in `index.js`.

Run this `npm run migrate`.

## How to migrate password users

Users are migrated, but passwords are not.

- Email users can however reset their password via email
- Users with Google or Facebook can log in as usual

## Notes

Flattens channels
```
cat input/database.json | jq '.channels | to_entries | map({id: .key, name: .value.title, slug: .value.slug, created_at: .value.created, updated_at: .value.updated, image: .value.image, url: .value.link})' > input/channels.json
```

Flattens tracks
```
cat input/database.json | jq '.tracks | to_entries | map({id: .key, url: .value.url, title: .value.title, created_at: .value.created})' > input/tracks.json
```
