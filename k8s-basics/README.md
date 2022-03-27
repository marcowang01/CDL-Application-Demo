
#K8s Basics

### Requirements
1. Dockerhub Account
2. Minikube ([link](https://minikube.sigs.k8s.io/docs/start/))
3. kubectl ([link](https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/))
4. HyperV (for Windows), VirtualBox (for MacOS)
    - might need to adjust BIOS and turn on windows features in control panel for HyperV

### Step 0: Setup Minikube Environment
1. start minikube cluster on a virtual machine
```console
$ Minkube start --driver=hyperv
```
2. log into your dockerhub account, and enter your credentials
```console 
$ docker login
```
3. alias kubectl command for ease
```console
$ alias k=kubectl
```
### Step 1: Build backend node.js app
1. Create node.js app running on express server with cross origin resource sharing 
```Javascript
const express = require('express');
const cors = require('cors');
const process = require('process');

// create express node.js app
const app = express();

// enables cross-origin resource sharing from any origin domain
app.use(cors({
    origin: '*'
}))
```
2. Include a simple API call for hello world and set node app to constantly listen to a port (3000 in this case)
```Javascript
// end point for front end to communicate with backend
app.get('/hello_world', (req, res) => {

    console.time("timer")
    res.send(`Got it, roger!    Average response time is ${process.env.TIME}`)
})

// listens for any requests on port 3000
app.listen(3000, function() {
    console.log('listening on 3000')
});
```
#### step 1a: dockerize node.js app
1. initalize node.js app and delete node modules folder, since it needs to be inside container
```Console
$ npm init -y
```
2. Create custom docker image from node. It must create a new directory for the app, run npm i, npm start and expose port 3000 as previously specified
3. push image to docker hub so that we can reference it later using k8s deployment
```Console
$ docker build . -t username/backend
$ docker push username/backend
```
#### step 1b: create k8s deployment and service for the backend
The container will be stored within a k8s pod, which has its own IP. But the IP cannot be accessed outside of the node. We must use an external service to generate an external IP, so the client can reach the backend pod
1. create deployment using k8s vs code code snippet. Change name and app to anything as long as each name-app pair matches
2. For pod specs, containerPort must match the exposed 3000 port and image must match the docker image we just pushed
```yaml
spec:
      containers:
        - name: node-container
          image: marcowang01/backend # references custom image on dockerhub
          ports:
            - containerPort: 3000 # match with server.js port
```
3. The service can be included in the same file with --- dividers. Again use the Service code snippet and change names and apps accordingly.
    - Target port must match the deployment port while port can be anything
4. To check if deployment and service and pods are successful, run following commands
```Console
$ k apply -f backend.yaml
$ k get all | grep backend
```
### Step 2: Build front end client
1. write out a simple index.html client app with one textbox, button, and div
```html
<body>
    <input name="inpText" type="text" maxlength="512" id="inpText"/>
    <button id="button" value="val" name="but">Send to pod 2</button>
    <div id="result"></div>
</body>
```
2. import ajax script from jquery to easily write api calls
```html
<head>
    <meta charset="utf-8" />
    <!-- imports ajax from jquery -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
</head>
```
3. write ajax function to print api call result if hello_world is sent 
```javascript
$.ajax({
        url: `/${inp}/`,
        type: "GET",
        data: {
            "Content-Type": undefined
        },
        // succesful result appends response to result div
        success: (res) => {
            if(res){
                console.log(res)
                $("#result")[0].innerHTML += `${res}<br>`;
                console.timeEnd("timer1");
            }
        },
        error: (err) => {
            console.log(err)
        }
    })
```
#### Step 2a: Nginx and dockerize
1. create custom nginx configuration to create custom nginx proxy server to connect the front end to the backend and vice versa. 
```js
upstream node-service{
	server node-service:3000;
}

server {
    listen       80;
    server_name  localhost;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }

	location /hello_world {
		proxy_pass http://node-service;
	}

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
```
2. Then, dockerize frontend. create custom image from nginx official image. Replace existing conf file with new custom conf. copy index.html into the working directory. 
3. Similar to backend, push to docker hub
```Console
$ docker build . -t username/frontend
$ docker push username/frontend
```
#### Step 2b: create k8s deployment and service
1. same steps as backend. but the port must match the port of nginx which is 80, and the container must match with the one we just pushed. 
```yaml
spec:
      containers:
        - name: node-container
          image: marcowang01/frontend
          ports:
            - containerPort: 80
```
2. Check if successful with k apply and k get
```Console
$ k apply -f frontend.yaml
$ k get all | grep front
```
### Step 3: Config Maps
1. Create config map from code snippet
2. Manually add two key value pairs under data
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: configmap
data:
  backend-time: "5.1 ms"
  frontend-time: "5.2 ms"
```
3. Mount configmap as env variables to both backend and front end as a pod spec. This is for the front end...
```yaml
env:
    - name: TIME
    valueFrom: 
        configMapKeyRef:
        name: configmap
        key: frontend-time
```
4. Everything has to be applied again. but the configmap must be applied first. 
```console
k apply -f configmap.yaml -f frontend.yaml -f backend.yaml
```
### Step 4: Get external URL and clean up
1. enter URL into browser
```console
$ Minikube service frontend-service --url
```
2. clean up
```console
$ k delete all --all
$ Minikube delet
```
### Final comments
I know that the project isn't completely inline with the project requirements. But I learned kubernetes in terms of developing a full stack web app, and with limited time, I developed it in the form that I am familiar with. I am not entirely sure how to create two standalone pods that can commuinicate by just IP references. I am also unsure on the part of average access times. For my config map, I simply included arbitrary values and mounted to the pods as environmental variables. The backend does indeeed successfully pass both the roger message and env variable to the frontend and print it to the client. However, it is not possible to print from the backend. To improve my app, I can use the REACT framework to include javascript in the frontend to refernce env variables, however, I ran out of time and I could not implement that in time. 

### [DEMO Link](https://youtu.be/3ynlfoO7U-A)
