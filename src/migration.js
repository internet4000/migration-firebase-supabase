import {v4} from 'uuid'
import {insertAuthUser, insertChannel, insertUserChannel, insertTrack, insertChannelTrack} from './queries.js'

// What's the plan?
// Take firebase: users, channels, tracks
// Insert into postgres: auth users, public users, channels, user_channel, tracks, channel_track

// migrate() controls the flow
// easyDb is a transformed firebase database where each user's data is grouped as an "entity".
// runQueries() takes a single user/entity and insert all data one by one

const migrate = async ({firebaseDatabase: db, postgresClient: client, logs}) => {
	// Clean up
	await client.query('DELETE FROM public.channel_track')
	await client.query('DELETE FROM public.channels')
	await client.query('DELETE FROM public.tracks')
	await client.query('DELETE FROM public.user_channel')
	await client.query('DELETE FROM auth.users')

	// Collect the objects we want in an easier structure to import.

	const total = db.length
	for (const [index, entity] of db.entries()) {
		const {user, channel, tracks} = entity
		console.log(`Inserting ${index + 1} of ${total}`, user?.id, channel?.title || 'no channel', tracks?.length || 'no tracks')
		try {
			await runQueries(client, {user, channel, tracks})
			logs.ok.push(user.id)
		} catch (err) {
			console.log('nop', entity)
			logs.failed.push(user.id)
		}
	}
}

async function runQueries(client, {user, channel, tracks}) {
	const newUserId = v4()

	try {
		await client.query(insertAuthUser(newUserId, user))
	} catch (err) {
		throw Error(err)
	}

	// Stop if the entity doesn't have a channel.
	if (!channel) return

	let newChannelId
	try {
		const res = await client.query(insertChannel(channel))
		newChannelId = res.rows[0].id
	} catch (err) {
		throw Error(err)
	}

	try {
		await client.query(insertUserChannel(newUserId, newChannelId))
	} catch (err) {
		throw Error(err)
	}

	if (!tracks) return

	let newTracks
	try {
		const trackQueries = tracks.filter((t) => t.url).map((track) => insertTrack(track))
		const results = await Promise.all(trackQueries.map((q) => client.query(q)))
		newTracks = results.map((result) => {
			return {
				id: result.rows[0].id,
				created_at: result.rows[0].created_at,
			}
		})
	} catch (err) {
		throw Error(err)
	}

	try {
		const channelTrackQueries = newTracks.map((newTrack) =>
			insertChannelTrack(newUserId, newChannelId, newTrack.id, newTrack.created_at)
		)
		await Promise.all(channelTrackQueries.map((q) => client.query(q)))
	} catch (err) {
		throw Error(err)
	}
}

export {migrate}
