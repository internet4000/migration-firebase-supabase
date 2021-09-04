import {v4} from 'uuid'

// What's the plan?
// Take firebase: users, channels, tracks
// Insert into postgres: auth users, public users, channels, user_channel, tracks, channel_track

const delay = (ms) =>
	new Promise((resolve) => {
		setTimeout(() => {
			resolve()
		}, ms)
	})

const migrate = async ({firebaseDatabase: db, postgresClient: client}) => {
	console.log('Migrating...')

	// Collect the objects we want in an easier structure to import.
	const easyDb = db.authUsers.slice(0, 3).map((authUser) => {
		// Find user from auth user
		const user = db.users.find((u) => u.id === authUser.localId)
		// Find single channel
		if (!user) return {}
		const channel = user.channels && db.channels.find((c) => c.id === Object.keys(user.channels)[0])
		// Find all tracks
		const trackIds = channel?.tracks ? Object.keys(channel.tracks) : []
		const tracks = trackIds.length ? trackIds.map((trackId) => db.tracks.find((t) => t.id === trackId)) : null
		return {user: authUser, channel, tracks}
	})

	// console.log(easyDb)
	// async function readFiles(files) {
	// 	await Promise.all(files.map(readFile))
	// }

	for (const entity of easyDb) {
		console.log(entity.user.createdAt)
		await runQueries(entity, client)
	}

	await delay(1000)

	console.log('Done migrating')

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

const insertTrack = (track) => {
	const {url, title, body, created} = track
	return {
		text: 'INSERT INTO tracks(url, title, description, created_at) VALUES($1, $2, $3, $4) RETURNING id, created_at',
		values: [url, title, body, created],
	}
}

const insertChannelTrack = (userId, channelId, trackId, createdAt) => {
	return {
		text: 'INSERT INTO channel_track(user_id, channel_id, track_id, created_at) VALUES($1, $2, $3, $4)',
		values: [userId, channelId, trackId, createdAt],
	}
}

async function runQueries(entity, client) {
	const {user, channel, tracks} = entity
	const newUserId = v4()

	console.log('Inserting to PostgreSQL for', user.email, channel?.title, tracks?.length)
	// await delay(2000)
	// console.log('done')

	try {
		await client.query(insertAuthUser(newUserId, user))
	} catch (err) {
		throw Error(err)
	}
	try {
		await client.query(insertUser(newUserId))
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

// Supabase expects {provider: 'email/google/facebook/etc'}
function extractProvider(firebaseUser) {
	return firebaseUser.providerUserInfo.length > 0
		? firebaseUser.providerUserInfo[0].providerId.replace('.com', '')
		: 'email'
}

export {migrate}
