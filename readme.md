<<<<<<< HEAD
<h3>API DOCUMENTATION</h3>
Please refer to the API documentation by clicking <a href="https://documenter.getpostman.com/view/2347717/movify/RVg56RZk">here</a>
To run inside a docker container:
# Building if not built yet.
docker build -t movify-backend .
# Run the image as a daemon, mapping 3000 to 8080 port of the host.
docker run -d \
	--name MovifyBackend \
  	--restart=always \
	--publish 8080:3000 \
	 movify-backend
>>>>>>> e2917320eeb2ec6ad6ceae063be2eb0196bd8e91