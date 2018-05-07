# API DOCUMENTATION

##### Use the following for login examples so that curl saves cookie
```
curl --request POST \
	--url http://localhost:3000/login \
	--header 'Content-Type: application/x-www-form-urlencoded' \
	--data 'key=user1&password=password' \
	--cookie-jar /tmp/cookie
```

#### For endpoints that require authentication, append the cookie as shown below
```
curl --request GET \
	--url http://localhost:3000/profile \
	--cookie /tmp/cookie
```

Please refer to the API documentation by clicking <a href="https://documenter.getpostman.com/view/2347717/movify/RW1dHywM" target="_blank">here</a>



## DOCKER Config
To run inside a Docker container:
### Building if not built yet
`docker build -t movify-backend .`

<b>Run the image as a daemon, mapping 3000 to 8080 port of the host.</b>
```
docker run -d \
	--name MovifyBackend \
	--restart=always \
	--publish 8080:3000 \
	 movify-backend
```

Mirror Gitlab repository for CI/CD:
https://gitlab.com/bymafmaf/MovifyBackend
