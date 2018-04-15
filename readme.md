<h3>API DOCUMENTATION</h3>
Please refer to the API documentation by clicking <a href="https://documenter.getpostman.com/view/2347717/movify/RVuAARQe">here</a>

<h3>DOCKER Config</h3>
To run inside a Docker container:
<h4>Building if not built yet</h4>
docker build -t movify-backend .
<b>Run the image as a daemon, mapping 3000 to 8080 port of the host.</b>
docker run -d \
	--name MovifyBackend \
  	--restart=always \
	--publish 8080:3000 \
	 movify-backend

Mirror Gitlab repository for CI/CD:
https://gitlab.com/bymafmaf/MovifyBackend
