const migrate = async ({
	firebaseDatabase: db,
	postgresClient: client
}) => {

	const addChannelPromises = db.channels.map(channel => {
		const addChannelQuery = {
			name: 'insert-channel',
			text: 'INSERT INTO channels(title) VALUES($1)',
			values: [channel.title],
		}
		return client.query(addChannelQuery)
	})

	let results
	try {
		results = await Promise.all(addChannelPromises)
	} catch (e) {
		console.error('Error migrating', e)
	}

	return {
		results
	}
}

export {
	migrate
}
