import {getDatabase} from './src/database.js'

const main = async () => {
	console.log('Migration running.')
	const dbf = await getDatabase()
	console.log('channels, %s', dbf.channels.length)
	console.log('tracks, %s', dbf.tracks.length)
}

main()
