import {v4} from 'uuid'
import {insertAuthUser, insertChannel, insertUserChannel, insertTrack, insertChannelTrack} from './queries.js'

/*
	What's the plan?
	input firebase: auth users, channels, tracks
	output postgres: auth users, channels, user_channel, tracks, channel_track

	migrate() controls the flow
	runQueries() takes a single user/entity and insert all data one by one
*/

export default async function migrate({firebaseDatabase: db, postgresClient: client, logs}) {
	const total = db.length

	// Clean up
	await client.query('DELETE FROM public.channel_track')
	await client.query('DELETE FROM public.channels')
	await client.query('DELETE FROM public.tracks')
	await client.query('DELETE FROM public.user_channel')
	await client.query('DELETE FROM auth.users')

	// Version 1: parallel queries
	// const queries = db.map(entity => runQueries(client, entity))
	const queries = db.map(async (entity) => {
		const {user, channel, tracks} = entity
		try {
			// await delay(1000)
			await runQueries(client, {user, channel, tracks})
			logs.ok.push(user.id)
			const processed = logs.ok.length + logs.failed.length
			const progress = Math.round((processed / total) * 100)
			console.log(progress + '%', user?.id, channel?.title || 'no channel', tracks?.length || 'no tracks')
		} catch (err) {
			console.log('failed', user.id, err)
			logs.failed.push(user.id)
		}
	})
	await Promise.all(queries)

	// Version 2: sequential queries
	// for (const [index, entity] of db.entries()) {
	// 	const {user, channel, tracks} = entity
	// 	try {
	// 		await runQueries(client, {user, channel, tracks})
	// 		logs.ok.push(user.id)
	// 		const progress = Math.round(((logs.ok.length + logs.failed.length) / total) * 100)
	// 		console.log(progress + '%', user?.id, channel?.title || 'no channel', tracks?.length || 'no tracks')
	// 	} catch (err) {
	// 		console.log('nop', err, entity)
	// 		logs.failed.push(user.id)
	// 	}
	// }
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
		const trackQueries = tracks.filter((t) => t.url).map((track) => client.query(insertTrack(track)))
		const results = await Promise.all(trackQueries)
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
		const channelTrackQueries = newTracks.map((track) =>
			client.query(insertChannelTrack(newUserId, newChannelId, track.id, track.created_at))
		)
		await Promise.all(channelTrackQueries)
	} catch (err) {
		throw Error(err)
	}
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
