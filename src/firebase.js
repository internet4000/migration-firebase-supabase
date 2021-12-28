import {readFile} from 'fs/promises'

// Reads input/database.json and input/auth-users.json
// and returns a map of serialized entities {user, channel, tracks}.
export default async function getDatabase(logs) {
	const rawDb = await readDatabase()
	const authUsers = await readAuthUsers()
	rawDb.authUsers = authUsers.users
	return serializeDatabase(rawDb, logs)
}

// Prepares the firebase db for import into the database
// by grouping related data into a single entity per user.
// Return false to skip a row.
const serializeDatabase = (rawDb, logs) => {
	const db = rawDb.authUsers
		.map((user) => {
			// User
			user.id = user.localId
			delete user.localId
			user.createdAt = toTimestamp(user.createdAt)
			if (user.lastSignedInAt) user.lastSignedInAt = toTimestamp(user.lastSignedInAt)

			// Channel
			const firebaseUser = rawDb.users[user.id]
			if (!firebaseUser) {
				logs.skipped.push(user.id)
				return false
			}
			const channel = firebaseUser.channels
				? Object.keys(firebaseUser.channels).map((id) => {
						const channel = rawDb.channels[id]
						if (!channel) return false
						channel.created = toTimestamp(channel.created)
						channel.updated = channel.updated ? toTimestamp(channel.updated) : channel.created
						return channel
				  })[0]
				: false

			if (!channel) {
				logs.skipped.push(user.id)
				return false
			}

			// Tracks
			const tracks = channel.tracks
				? Object.keys(channel.tracks).map((id) => {
						const track = rawDb.tracks[id]
						if (!track.title) track.title = 'Untitled'
						track.id = id
						track.created = toTimestamp(track.created)
						return track
				  })
				: []

			return {user, channel, tracks}
		})
		// Remove invalid entities
		.filter((entity) => entity && entity.channel)
	return db
}

const readFileWrap = async (path) => {
	let dataUtf8
	try {
		dataUtf8 = await readFile(path, 'utf8')
	} catch (err) {
		console.error(err)
	}
	return JSON.parse(dataUtf8)
}
const readDatabase = async () => readFileWrap('./input/database.json')
const readAuthUsers = async () => readFileWrap('./input/auth-users.json')

// new Date("1411213745028").toISOString()
// ==> "2014-09-20T11:49:05.028Z"
function toTimestamp(timestamp) {
	return new Date(Number(timestamp)).toISOString()
}

/* takes a firebase collection dict, return an array of models */
// const serializeCollection = (collection = {}) => {
// 	return Object.keys(collection).map((id) => {
// 		let model = collection[id]
// 		model.id = id
// 		return model
// 	})
// }
// function serializeUser(user) {}
// function serializeChannel(channel) {}
// function serializeTrack(track) {}
