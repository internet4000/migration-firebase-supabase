import pg from 'pg'

const getDatabase = async () => {
	const {Client} = pg
	const client = new Client()
	await client.connect().catch(e => {
		console.error(e)
		console.error('Is your postgresql database running? Are the .env info correct?')
	})
	return client
}

const migrateFirebase = async () => {
	return
}

export {
	getDatabase,
	migrateFirebase
}
