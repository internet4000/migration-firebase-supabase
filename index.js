import dotenv from 'dotenv'
import {getDatabase as getFirebase} from './src/firebase.js'
import dbp from './src/postgres.js'
import {migrate} from './src/migration.js'

const main = async (env) => {
	/* a firebase (serialized) json data */
	const dbf = await getFirebase()
	console.log('users, %s', dbf.authUsers.length)
	console.log('channels, %s', dbf.channels.length)
	console.log('tracks, %s', dbf.tracks.length)

	/* a postgres client */
	const dbTimeStarted = await dbp.query('SELECT NOW()')

	/* do the migration */
	const migration = await migrate({
		firebaseDatabase: dbf,
		postgresClient: dbp,
	})

	const dbTimeEnd = await dbp.query('SELECT NOW()')
	var start = new Date(dbTimeStarted.rows[0].now)
	var end = new Date(dbTimeEnd.rows[0].now)
	var elapsedSeconds = (end.getTime() - start.getTime()) / 1000
	console.log(`Migration successful in ${elapsedSeconds}`)

	await dbp.pool.end()
}

/* get the dot env, required for postgres db connection */
const config = dotenv.config()
if (config.error) {
	console.error('Missing .env file')
} else {
	/* init the app with dot env as config */
	console.log('Migration running.')
	main(config.parsed)
}
