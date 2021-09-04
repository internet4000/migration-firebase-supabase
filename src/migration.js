import {v4} from 'uuid'

// What's the plan?
// Take firebase: users, channels, tracks
// Insert into postgres: auth users, public users, channels, user_channel, tracks, channel_track

const migrate = async ({firebaseDatabase: db, postgresClient: client}) => {
	let tempUsers = []

	console.log('Migrating...')

	// Collect the objects we want in an easier structure to import.
	const easyDb = db.authUsers.slice(0, 5).map((authUser) => {
		// Find user from auth user
		const user = db.users.find((u) => u.id === authUser.localId)
		// Find single channel
		if (!user) return {}
		const channel = user.channels && db.channels.find((c) => c.id === Object.keys(user.channels)[0])
		// Find all tracks
		const trackIds = channel?.tracks ? Object.keys(channel.tracks) : []
		const tracks = trackIds.length ? trackIds.map((trackId) => db.tracks.find((t) => t.id === trackId)) : []
		return {user: authUser, channel, tracks}
	})

	easyDb.forEach(async (entity) => {
		const {user, channel, tracks} = entity
		const newUserId = v4()
		console.log('Inserting to PostgreSQL for', user.email, channel?.title, tracks.length)

		try {
			await client.query(insertAuthUser(newUserId, user))
		} catch (err) {
			console.log(err)
		}

		try {
			await client.query(insertUser(newUserId))
		} catch (err) {
			console.log(err)
		}

		// let newChannelId
		// try {
		// 	const res = await client.query(insertChannel(channel))
		// 	console.log(res.rows)
		// 	newChannelId = res.rows[0].id
		// } catch (err) {
		// 	console.log(err)
		// }

		// try {
		// 	await client.query(insertUserChannel(newUserId, newChannelId))
		// } catch (err) {
		// 	console.log(err)
		// }
		// insertTracks()
		// insertChannelTracks()
	})

	return true
}

const insertAuthUser = (id, authUser) => {
	const {email, createdAt, passwordHash} = authUser
	const provider = {provider: extractProvider(authUser)}
	// @todo what about the password salt?
	return {
		text: 'INSERT INTO auth.users(id, email, email_confirmed_at, created_at, encrypted_password, raw_app_meta_data) VALUES($1, $2, $3, $4, $5, $6) RETURNING id',
		values: [id, email, createdAt, createdAt, passwordHash, provider],
	}
}

const insertUser = (id) => {
	return {
		text: 'INSERT INTO users(id) VALUES($1)',
		values: [id],
	}
}

const insertChannel = (channel) => {
	const {title, slug, body, created, updated, link, image} = channel
	return {
		text: 'INSERT INTO channels(name, slug, description, created_at, updated_at, url, image) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id',
		values: [title, slug, body, created, updated, link, image],
	}
}

const insertUserChannel = (userId, channelId) => {
	return {
		text: 'INSERT INTO user_channel(user_id, channel_id) VALUES($1, $2)',
		values: [userId, channelId],
	}
}

// // 3. Insert channels
// await Promise.all(
// 	tempUsers.map(async (user) => {
// 		const channel = db.channels.find((c) => c.id === user.firebaseChannelId)
// 		if (channel) {
// 			const {title, slug, body, created, updated, link, image} = channel
// 			const res = await client.query({
// 				text: 'INSERT INTO channels(name, slug, description, created_at, updated_at, url, image) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id',
// 				values: [title, slug, body, created, updated, link, image],
// 			})
// 			// console.log(res.rows[0])
// 			tempUsers.find((u) => u.supabaseId === user.supabaseId).supabaseChannelId = res.rows[0].id
// 		}
// 	})
// )
// console.log(tempUsers)

// // 4. Insert user_channel junction rows, if firebase user has one.
// const insertUserChannels = tempUsers.map((tempUser) => {
// 	if (!tempUser.supabaseChannelId) return false
// 	return {
// 		text: 'INSERT INTO user_channel(user_id, channel_id) VALUES($1, $2)',
// 		values: [tempUser.supabaseId, tempUser.supabaseChannelId],
// 	}
// })
// await runQueries(insertUserChannels, client)

// const tempTracks = []
// await Promise.all(
// 	db.tracks.map(async (track) => {
// 		const {url, title, body, created, updated} = track
// 		const res = await client.query({
// 			text: 'INSERT INTO tracks(url, title, description, created_at) VALUES($1, $2, $3, $4) RETURNING id',
// 			values: [url, title, body, created],
// 		})
// 		tempTracks.push({supabaseTrackId: res.rows[0].id, firebaseTrackId: track.id})
// 	})
// )
// const insertChannelTracks = db.tracks.map((track) => {
// 	return {
// 		text: 'INSERT INTO channel_track(user_id, channel_id, track_id, created_at) VALUES($1, $2, $3, $4)',
// 		values: ['hardcoded', track.channel, track.id, track.created],
// 	}
// })

export {migrate}

// Tiny helper that runs a bunch of promises and catches any errors.
async function runQueries(queries, client) {
	const promises = []
	queries.forEach((q) => {
		if (q) promises.push(client.query(q))
	})
	let results
	try {
		results = await Promise.all(promises)
	} catch (err) {
		console.error('Error running queries', err)
		throw Error(err)
	}
	return results
}

// Supabase expects {provider: 'email/google/facebook/etc'}
function extractProvider(firebaseUser) {
	return firebaseUser.providerUserInfo.length > 0
		? firebaseUser.providerUserInfo[0].providerId.replace('.com', '')
		: 'email'
}
