import dotenv from 'dotenv'
import {getDatabase as getFirebase} from './src/firebase.js'
import postgresClient from './src/postgres.js'
import {migrate} from './src/migration.js'

const logs = {
	ok: [],
	failed: [],
	skipped: [],
}

const main = async (env) => {
	const firebaseDatabase = await getFirebase(logs)
	console.log(`Migrating ${firebaseDatabase.length} users with channel and tracks...`)

	const dbTimeStarted = await postgresClient.query('SELECT NOW()')
	await migrate({firebaseDatabase, postgresClient, logs})
	const dbTimeEnd = await postgresClient.query('SELECT NOW()')

	logs.start = new Date(dbTimeStarted.rows[0].now).getTime()
	logs.end = new Date(dbTimeEnd.rows[0].now).getTime()
	logs.duration = logs.end - logs.start
	console.log(`Migration ended in ${logs.duration / 1000} seconds`)
	console.log(`${logs.ok.length} ok, ${logs.failed.length} failed, ${logs.skipped.length} skipped.`)

	fs.writeFileSync('./logs.json', JSON.stringify(logs, null, 2), 'utf-8')

	await postgresClient.pool.end()
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
