import fs from 'fs'
import dotenv from 'dotenv'
import getFirebase from './src/firebase.js'
import postgresClient from './src/postgres.js'
import migrate from './src/migration.js'

const logs = {
	start: 0,
	end: 0,
	duration: 0,
	ok: [],
	failed: [],
	skipped: [],
}

const main = async (env) => {
	const firebaseDatabase = await getFirebase(logs)

	const db = firebaseDatabase//.slice(0, 1000)

	console.log(`Migrating ${db.length} users with channel and tracks...`)

	const startTime = await postgresClient.query('SELECT NOW()')
	await migrate({firebaseDatabase: db, postgresClient, logs})
	const endTime = await postgresClient.query('SELECT NOW()')

	logs.start = new Date(startTime.rows[0].now).getTime()
	logs.end = new Date(endTime.rows[0].now).getTime()
	logs.duration = logs.end - logs.start
	console.log(`Migration ended in ${logs.duration / 1000} seconds`)
	console.log(`${logs.ok.length} ok, ${logs.failed.length} failed, ${logs.skipped.length} skipped.`)
	fs.writeFileSync('./output/logs.json', JSON.stringify(logs, null, 2), 'utf-8')

	await postgresClient.pool.end()
}

/* get the dot env, required for postgres db connection */
const config = dotenv.config()
if (config.error) {
	console.error('Missing .env file')
} else {
	/* init the app with dot env as config */
	main(config.parsed)
}
