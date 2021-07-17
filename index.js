import dotenv from 'dotenv'
import {getDatabase as getFirebase} from './src/firebase.js'
import {getDatabase as getPostgres} from './src/postgres.js'
import {migrate} from './src/migration.js'

const main = async (env) => {
	/* a firebase (serialized) json data */
	const dbf = await getFirebase()
	console.log('channels, %s', dbf.channels.length)
	console.log('tracks, %s', dbf.tracks.length)

	/* a postgres client */
	const dbp = await getPostgres()
	const dbTimeStarted = await dbp.query('SELECT NOW()')

	/* do the migration */
	const migration = await migrate({
		firebaseDatabase: dbf,
		postgresClient: dbp
	})

	const dbTimeEnd = await dbp.query('SELECT NOW()')
	console.log(`
Started  : %s
Ended    : %s
	`,
		dbTimeStarted.rows[0].now,
		dbTimeEnd.rows[0].now
	)

	/* end the connection to postgres */
	dbp.end()
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
