import pg from 'pg'

const pool = new pg.Pool()

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
})

export default {
	pool,
	query: (text, params) => {
		return pool.query(text, params)
	}
}
