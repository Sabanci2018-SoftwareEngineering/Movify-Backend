<h1>TODO</h1>
	<h2>- Database creation</h2>
	<h2>- Comparison of movie DB approaches to use the best method</h2>
	<h2>- Prepare API gateway</h2>

To run inside a docker container:
# Building if not built yet.
docker build -t movify-backend .
# Run the image as a daemon, mapping 3000 to 8080 port of the host.
docker run -d \
	--name MovifyBackend \
  	--restart=always \
	--publish 8080:3000 \
	 movify-backend
