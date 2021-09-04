import pg from 'pg'

const pool = new pg.Pool()

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
})

// const getDatabase = async () => {
// 	const client = await pool.connect().catch((e) => {
// 		console.error(e)
// 		console.error('Is your postgresql database running? Are the .env info correct?')
// 	})
// 	return client
// }

export default {
	pool,
	query: (text, params) => {
		return pool.query(text, params)
	}
}
