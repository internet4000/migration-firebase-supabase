import {readFile} from 'fs/promises'


const readFileWrap = async (path) => {
	let dataUtf8
	try {
		dataUtf8 = await readFile(path, 'utf8')
	} catch (err) {
		console.error(err)
	}
	return JSON.parse(dataUtf8)
}

const readDatabase = async () => {
	return readFileWrap('./input/database.json')
}

const readAuthUsers = async () => {
	return readFileWrap('./input/auth-users.json')
}

// new Date(1411213745028).toISOString()
// ==> "2014-09-20T11:49:05.028Z"
function convertTimestamp(timestamp) {
	return new Date(Number(timestamp)).toISOString()
}

/* takes a dict, return an array of models */
const serializeCollection = (
	collection = {} // firebase collection dict
) => {
	return Object.keys(collection).map((id) => {
		let model = collection[id]
		model.id = id
		if (model.created) model.created = convertTimestamp(model.created)
		if (model.updated) model.updated = convertTimestamp(model.updated)
		return model
	})
}

/* models serializers */
const serializeUsers = (collectionDict) => {
	return serializeCollection(collectionDict)
}

const serializeAuthUsers = (collectionDict) => {
	const collection = serializeCollection(collectionDict)
	collection.forEach((item) => {
		if (item.createdAt) item.createdAt = convertTimestamp(item.createdAt)
		if (item.lastSignedInAt) item.lastSignedInAt = convertTimestamp(item.lastSignedInAt)
	})
	return collection
}

const serializeChannels = (collectionDict) => {
	const collection = serializeCollection(collectionDict)
	collection.forEach((item) => {
		// delete item.tracks
		delete item.favoriteChannels
	})
	return collection
}

const serializeTracks = (collectionDict) => {
	const collection = serializeCollection(collectionDict)
	collection.forEach((item) => {
		// A few tracks are missing a title. We need one.
		if (!item.title) item.title = 'Untitled'
	})
	return collection
}

/* find the right serializer for each model */
const serializeDatabase = (rawDb) => {
	console.log('serializing db', Object.keys(rawDb))
	const models = {
		users: serializeUsers,
		authUsers: serializeAuthUsers,
		channels: serializeChannels,
		tracks: serializeTracks
	}
	const serializedDb = {}
	Object.keys(models).forEach((modelName) => {
		const modelSerializer = models[modelName]
		serializedDb[modelName] = modelSerializer(rawDb[modelName])
	})

	return serializedDb
}

const getDatabase = async () => {
	const rawDb = await readDatabase()
	const authUsers = await readAuthUsers()
	rawDb.authUsers = authUsers.users
	const db = serializeDatabase(rawDb)
	return db
}

export {getDatabase}
