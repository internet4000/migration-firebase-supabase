import {v4} from 'uuid'

const migrate = async ({firebaseDatabase: db, postgresClient: client}) => {
	let tempUsers = []
	let tempResults

	// 1. Insert auth users
	const insertAuthUsers = db.authUsers
		// .slice(0, 50) // to make it go faster
		.map((user) => {
			const newUserId = v4()

			// Supabase expects {provider: 'email/google/facebook/etc'}
			const provider = {
				provider:
					user.providerUserInfo.length > 0
						? user.providerUserInfo[0].providerId.replace('.com', '')
						: 'email',
			}

			// @todo what about this password salt?
			//salt: "2pvnuJ2yE347gQ==",

			// To make future queries easier
			const firebaseUser = db.users.find((u) => u.id === user.localId)

			tempUsers.push({
				supabaseId: newUserId,
				firebaseId: user.localId,
				firebaseChannelId:
					firebaseUser && firebaseUser.channels ? Object.keys(firebaseUser.channels)[0] : null,
			})

			return {
				text: 'INSERT INTO auth.users(id, email, email_confirmed_at, created_at, last_sign_in_at, encrypted_password, raw_app_meta_data) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id',
				values: [
					newUserId,
					user.email,
					user.createdAt,
					user.createdAt,
					user.lastSignedInAt,
					user.passwordHash,
					provider,
				],
			}
		})
	await runQueries(insertAuthUsers, client)

	// 2. Insert public users reusing id from auth users
	const insertUsers = tempUsers.map((user) => {
		return {
			text: 'INSERT INTO users(id) VALUES($1)',
			values: [user.supabaseId],
		}
	})
	await runQueries(insertUsers, client)

	// 3. Insert channels
	await Promise.all(
		tempUsers.map(async (user) => {
			const channel = db.channels.find((c) => c.id === user.firebaseChannelId)
			if (channel) {
				const {title, slug, body, created, updated, link, image} = channel
				const res = await client.query({
					text: 'INSERT INTO channels(name, slug, description, created_at, updated_at, url, image) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id',
					values: [title, slug, body, created, updated, link, image],
				})
				// console.log(res.rows[0])
				tempUsers.find((u) => u.supabaseId === user.supabaseId).supabaseChannelId = res.rows[0].id
			}
		})
	)
	console.log(tempUsers)

	// 4. Insert user_channel junction rows, if firebase user has one.
	const insertUserChannels = tempUsers.map((tempUser) => {
		if (!tempUser.supabaseChannelId) return false
		return {
			text: 'INSERT INTO user_channel(user_id, channel_id) VALUES($1, $2)',
			values: [tempUser.supabaseId, tempUser.supabaseChannelId],
		}
	})
	await runQueries(insertUserChannels, client)

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
}

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
