import {v4} from 'uuid'

// What's the plan?
// Take firebase: users, channels, tracks
// Insert into postgres: auth users, public users, channels, user_channel, tracks, channel_track

// migrate() controls the flow
// easyDb is a transformed firebase database where each user's data is grouped as an "entity".
// runQueries() takes a single user/entity and insert all data one by one

const migrate = async ({firebaseDatabase: db, postgresClient: client}) => {
	console.log('Migration started. Preparing inputs...')

	// Collect the objects we want in an easier structure to import.
	const easyDb = db.authUsers
		.slice(0, 100)
		.filter((authUser) => authUser && authUser.localId)
		.map((authUser) => {
			// Find user from auth user
			const user = db.users.find((u) => u.id === authUser.localId)
			// If no user or channel, no need to migrate.
			if (!user) {
				console.log('skipping because no user', authUser)
				return false
			} else if (!user.channels) {
				console.log('skipping because no channels', authUser)
				return false
			}
			// Find single channel
			const channel = user.channels && db.channels.find((c) => c.id === Object.keys(user.channels)[0])
			// Find all tracks
			const trackIds = channel?.tracks ? Object.keys(channel.tracks) : []
			const tracks = trackIds.length
				? trackIds.map((trackId) => db.tracks.find((t) => t.id === trackId))
				: null
			return {user: authUser, channel, tracks}
		})
		.filter(entity => entity !== false)

	console.log(`Migrating ${easyDb.length} users with channel and tracks.`)

	const total = easyDb.length
	for (const [index, entity] of easyDb.entries()) {
		const {user, channel, tracks} = entity
		if (!user || !channel) continue
		console.log(`Inserting ${index} of ${total}`, user?.localId, channel?.title, tracks?.length)
		await runQueries({user, channel, tracks, client})
	}

	await delay(500)
	console.log('Done migrating')
}

async function runQueries({user, channel, tracks, client}) {
	const newUserId = v4()

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

const insertAuthUser = (id, authUser) => {
	const {email, createdAt, passwordHash} = authUser
	const provider = {provider: extractProvider(authUser)}
	// @todo what about the password salt?
	return {
		text: 'INSERT INTO auth.users(aud, role, instance_id, id, email, email_confirmed_at, created_at, encrypted_password, raw_app_meta_data) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
		values: ["authenticated", "authenticated", '00000000-0000-0000-0000-000000000000', id, email, createdAt, createdAt, passwordHash, provider],
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

// Supabase expects {provider: 'email/google/facebook/etc'}
function extractProvider(firebaseUser) {
	return firebaseUser.providerUserInfo.length > 0
		? firebaseUser.providerUserInfo[0].providerId.replace('.com', '')
		: 'email'
}

const delay = (ms) =>
	new Promise((resolve) => {
		setTimeout(() => {
			resolve()
		}, ms)
	})

export {migrate}
