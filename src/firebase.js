import {
	readFile,
} from 'fs/promises'

const readDatabase = async () => {
	let dataUtf8
	try {
		dataUtf8 = await readFile('./input/database.json', 'utf8')
	} catch (err) {
		console.error(err)
	}

	const dataJson = JSON.parse(dataUtf8)
	return dataJson
}

/* takes a dict, return an array of models */
const serializeCollection = (collection) => {
	return Object.keys(collection).map(modelId => {
		return collection[modelId]
	})
}

/* models serializers */
const serializeChannels = (collectionDict) => {
	return serializeCollection(collectionDict)
}

const serializeTracks = (collectionDict) => {
	return serializeCollection(collectionDict)
}

/* find the right serializer for each model */
const serializeDatabase = (rawDb) => {
	console.log(Object.keys(rawDb))
	const models = {
		channels: serializeChannels,
		tracks: serializeTracks
	}
	const serializedDb = {}
	Object.keys(models).forEach(modelName => {
		const modelSerializer = models[modelName]
		serializedDb[modelName] = modelSerializer(rawDb[modelName])
	})

	return serializedDb
}

const getDatabase = async () => {
	const rawDb = await readDatabase()
	const db = serializeDatabase(rawDb)
	return db
}

export {getDatabase}
